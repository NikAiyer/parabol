import {GraphQLBoolean, GraphQLID, GraphQLNonNull, GraphQLString} from 'graphql'
import {SubscriptionChannel} from 'parabol-client/types/constEnums'
import getRethink from '../../database/rethinkDriver'
import {getUserId} from '../../utils/authorization'
import publish from '../../utils/publish'
import {GQLContext} from '../graphql'
import EditCommentingPayload from '../types/EditCommentingPayload'
import toTeamMemberId from 'parabol-client/utils/relay/toTeamMemberId'

export default {
  type: EditCommentingPayload,
  description: `Track which users are commenting`,
  args: {
    isCommenting: {
      type: new GraphQLNonNull(GraphQLBoolean),
      description: 'true if the user is commenting, false if the user has stopped commenting'
    },
    meetingId: {
      type: GraphQLNonNull(GraphQLID)
    },
    preferredName: {
      type: GraphQLNonNull(GraphQLString)
    },
    threadId: {
      type: GraphQLNonNull(GraphQLID)
    }
  },
  resolve: async (
    _source,
    {isCommenting, meetingId, preferredName, threadId},
    {authToken, dataLoader, socketId: mutatorId}: GQLContext
  ) => {
    const r = await getRethink()
    const viewerId = getUserId(authToken)
    const operationId = dataLoader.share()
    const subOptions = {mutatorId, operationId}
    const now = new Date()

    //AUTH
    const meetingMemberId = toTeamMemberId(meetingId, viewerId)

    const [meeting, viewerMeetingMember] = await Promise.all([
      r
        .table('NewMeeting')
        .get(meetingId)
        .run(),
      dataLoader.get('meetingMembers').load(meetingMemberId)
    ])

    if (!meeting) {
      return {error: {message: 'Meeting not found'}}
    }
    if (!viewerMeetingMember) {
      return {error: {message: `Not a part of the meeting`}}
    }
    const {endedAt} = meeting
    if (endedAt) {
      return {error: {message: 'Meeting already ended'}}
    }

    // RESOLUTION
    const thread = await r
      .table('RetroReflectionGroup')
      .get(threadId)
      .run()
    const commentingNames = thread.commentingNames

    if (!isCommenting && !commentingNames)
      return {error: {message: "Can't remove an id that doesn't exist!"}}

    let updatedCommentingNames
    if (isCommenting) {
      if (!commentingNames) {
        updatedCommentingNames = [preferredName]
      } else {
        updatedCommentingNames = [...commentingNames, preferredName]
      }
    } else {
      if (!commentingNames || commentingNames?.length <= 1) {
        updatedCommentingNames = null
      } else {
        updatedCommentingNames = commentingNames?.filter((name) => name !== preferredName)
      }
    }
    console.log('updatedCommentingNames', updatedCommentingNames)

    await r
      .table('RetroReflectionGroup')
      .get(threadId)
      .update({commentingNames: updatedCommentingNames, updatedAt: now})
      .run()

    const data = {isCommenting, meetingId, preferredName, threadId}
    publish(SubscriptionChannel.MEETING, meetingId, 'EditCommentingPayload', data, subOptions)

    return data
  }
}
