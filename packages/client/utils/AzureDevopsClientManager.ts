import Atmosphere from '../Atmosphere'
import {MenuMutationProps} from '../hooks/useMutationProps'
import makeHref from './makeHref'
import getOAuthPopupFeatures from './getOAuthPopupFeatures'
import AddAzureDevopsAuthMutation from '../mutations/AddAzureDevopsAuthMutation'

export interface AzureDevopsUser {
  self: string
  key: string
  accountId: string
  name: string
  emailAddress: string
  avatarUrls: {[key: string]: string}
  displayName: string
  active: boolean
  timeZone: string
}

export interface AccessibleResource {
  id: string
  name: string
  scopes: string[]
  avatarUrl: string
}

export interface AzureDevopsProject {
  self: string
  id: string
  key: string
  name: string
  avatarUrls: {
    '48x48': string
    '24x24': string
    '16x16': string
    '32x32': string
  }
  projectCategory: {
    self: string
    id: string
    name: string
    description: string
  }
  simplified: boolean
  style: string
}

export interface AzureDevopsProjectResponse {
  self: string
  nextPage: string
  maxResults: number
  startAt: number
  total: number
  isLast: boolean
  values: AzureDevopsProject[]
}

export interface AzureDevopsIssueType {
  self: string
  id: string
  description: string
  iconUrl: string
  name: string
  subtask: boolean
  fields?: {
    issuetype: {
      required: boolean
      name: string
      key: string
      hasDefaultValue: false
      operations: string[]
    }
  }
}

export interface AzureDevopsError {
  code: number
  message: string
}

interface AzureDevopsClientManagerOptions {
  fetch?: Window['fetch']
  refreshToken?: string
}

interface GetProjectsResult {
  organization: string
  newProjects: AzureDevopsProject[]
}

interface Reporter {
  id: string
}

interface Assignee {
  id: string
}

interface CreateIssueFields {
  assignee: Assignee
  summary: string
  description?: object
  reporter?: Reporter // probably can't use, it throws a lot of errors
  project?: Partial<AzureDevopsProject>
  issuetype?: Partial<AzureDevopsIssueType>
}

interface WorkItemCreateMetadata {
  projects: (Pick<AzureDevopsProject, 'self' | 'id' | 'key' | 'name' | 'avatarUrls'> & {
    issuetypes: AzureDevopsIssueType[]
  })[]
}

interface AzureDevopsCreateIssueResponse {
  id: string
  key: string
  self: string
}

type GetProjectsCallback = (
  error: AzureDevopsError | null,
  result: GetProjectsResult | null
) => void

interface AzureBoardsError {
  errorMessages: any[]
  errors: {
    [fieldName: string]: string
  }
}

//TODO: review full auth process
class AzureDevopsClientManager {
  static SCOPE =
    'vso.graph_manage vso.project_manage vso.tokenadministration vso.tokens vso.work_full'
  static openOAuth(atmosphere: Atmosphere, teamId: string, mutationProps: MenuMutationProps) {
    const {submitting, onError, onCompleted, submitMutation} = mutationProps
    const providerState = Math.random()
      .toString(36)
      .substring(5)

    // Callbackurl hack
    AddAzureDevopsAuthMutation(
      atmosphere,
      {
        code:
          'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6Im9PdmN6NU1fN3AtSGpJS2xGWHo5M3VfVjBabyJ9.eyJhdWkiOiJkZTA1Yzc2Ni0wZjAzLTRlMTAtOWY0ZS0yNzFkZjFlNmFhNmYiLCJuYW1laWQiOiJhZWFjMDg0MS0zYjgwLTQ5MjQtOTEyMC1mNGU3NDk4NzE1NzciLCJzY3AiOiJ2c28uZ3JhcGhfbWFuYWdlIHZzby5wcm9qZWN0X21hbmFnZSB2c28udG9rZW5hZG1pbmlzdHJhdGlvbiB2c28udG9rZW5zIHZzby53b3JrX2Z1bGwgdnNvLmF1dGhvcml6YXRpb25fZ3JhbnQiLCJpc3MiOiJhcHAudnN0b2tlbi52aXN1YWxzdHVkaW8uY29tIiwiYXVkIjoiYXBwLnZzdG9rZW4udmlzdWFsc3R1ZGlvLmNvbSIsIm5iZiI6MTU3NTkxMzExMCwiZXhwIjoxNTc1OTE0MDEwfQ.XgPesptrO4tam4XLQTeMrMU1XBYh6akB_7V_w3iuTG-2OuYynEzU-oe-9n6OPD7Jso1Mciiaa1gY0lEUHRyaGsg3Bwu4VoCquv1kY-ureikDYZzupKbypL6okFGK0a588spRp2tW9LKQq5KJdWJf_YDaFmJxHIl81GZrd2-6UW9_hiVRs6N2uq2Y1wX1AYRLIwAm7QMNgONk87j_8jX9P6U3LKmr6xVJtkUR2_3GPEiH5asXRBNelF6MzcNu4co-tqS719g2tY0To2keOkiYYjTimgjVzltWMwB7j_eD-GvaBTws_ORiXq5rCe01tJ315oAAK0tvdae_RJIkXZNzZg',
        teamId
      },
      {onError, onCompleted}
    )
    return

    // const redirect = makeHref('/auth/azuredevops')
    const redirect = 'https://jdahost:3001/auth/azuredevops'
    const uri = `https://app.vssps.visualstudio.com/oauth2/authorize?client_id=${
      window.__ACTION__.azuredevops
    }&scope=${encodeURI(
      AzureDevopsClientManager.SCOPE
    )}&redirect_uri=${redirect}&state=${providerState}&response_type=Assertion`

    const popup = window.open(
      uri,
      'OAuth',
      getOAuthPopupFeatures({width: 500, height: 810, top: 56})
    )
    const handler = (event) => {
      if (typeof event.data !== 'object' || event.origin !== window.location.origin || submitting) {
        return
      }
      const {code, state} = event.data
      if (state !== providerState || typeof code !== 'string') return
      submitMutation()

      // AddAzureDevopsAuthMutation(atmosphere, {code, teamId}, {onError, onCompleted})
      // Callbackurl hack
      AddAzureDevopsAuthMutation(
        atmosphere,
        {
          code:
            'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6Im9PdmN6NU1fN3AtSGpJS2xGWHo5M3VfVjBabyJ9.eyJhdWkiOiJkZTA1Yzc2Ni0wZjAzLTRlMTAtOWY0ZS0yNzFkZjFlNmFhNmYiLCJuYW1laWQiOiJhZWFjMDg0MS0zYjgwLTQ5MjQtOTEyMC1mNGU3NDk4NzE1NzciLCJzY3AiOiJ2c28uZ3JhcGhfbWFuYWdlIHZzby5wcm9qZWN0X21hbmFnZSB2c28udG9rZW5hZG1pbmlzdHJhdGlvbiB2c28udG9rZW5zIHZzby53b3JrX2Z1bGwgdnNvLmF1dGhvcml6YXRpb25fZ3JhbnQiLCJpc3MiOiJhcHAudnN0b2tlbi52aXN1YWxzdHVkaW8uY29tIiwiYXVkIjoiYXBwLnZzdG9rZW4udmlzdWFsc3R1ZGlvLmNvbSIsIm5iZiI6MTU3NTkxMzExMCwiZXhwIjoxNTc1OTE0MDEwfQ.XgPesptrO4tam4XLQTeMrMU1XBYh6akB_7V_w3iuTG-2OuYynEzU-oe-9n6OPD7Jso1Mciiaa1gY0lEUHRyaGsg3Bwu4VoCquv1kY-ureikDYZzupKbypL6okFGK0a588spRp2tW9LKQq5KJdWJf_YDaFmJxHIl81GZrd2-6UW9_hiVRs6N2uq2Y1wX1AYRLIwAm7QMNgONk87j_8jX9P6U3LKmr6xVJtkUR2_3GPEiH5asXRBNelF6MzcNu4co-tqS719g2tY0To2keOkiYYjTimgjVzltWMwB7j_eD-GvaBTws_ORiXq5rCe01tJ315oAAK0tvdae_RJIkXZNzZg',
          teamId
        },
        {onError, onCompleted}
      )
      popup && popup.close()
      window.removeEventListener('message', handler)
    }
    window.addEventListener('message', handler)
  }

  accessToken: string
  refreshToken?: string
  private readonly get: (url: string) => any
  private readonly post: (url: string, payload: object) => any
  // the any is for node until we can use tsc in nodeland
  cache: {[key: string]: {result: any; expiration: number | any}} = {}
  timeout = 5000

  constructor(accessToken: string, options: AzureDevopsClientManagerOptions = {}) {
    this.accessToken = accessToken
    this.refreshToken = options.refreshToken
    const fetch = options.fetch || window.fetch
    const headers = {
      // an Authorization requires a preflight request, ie reqs are slow
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json' as 'application/json',
      'Content-Type': 'application/json'
    }
    this.post = async (url, payload) => {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      })
      return res.json()
    }

    this.get = async (url) => {
      const record = this.cache[url]
      if (!record) {
        const res = await fetch(url, {headers})
        const result = await res.json()
        this.cache[url] = {
          result,
          expiration: setTimeout(() => {
            delete this.cache[url]
          }, this.timeout)
        }
      } else {
        clearTimeout(record.expiration)
        record.expiration = setTimeout(() => {
          delete this.cache[url]
        }, this.timeout)
      }
      return this.cache[url].result
    }
  }

  //TODO: review full auth process
  async getAccessibleResources() {
    return this.get('https://api.atlassian.com/oauth/token/accessible-resources') as
      | AccessibleResource[]
      | AzureDevopsError
  }

  //async getMyself (cloudId: string) {
  async getMyself() {
    //return this.get(`https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/myself`) as
    return this.get(
      `https://app.vssps.visualstudio.com/_apis/profile/profiles/me?api-version=5.1`
    ) as AzureDevopsUser | AzureDevopsError
  }

  async getPaginatedProjects(organization: string, url: string, callback: GetProjectsCallback) {
    const res = (await this.get(url)) as AzureDevopsProjectResponse | AzureDevopsError
    if ('message' in res) {
      callback(res, null)
    } else {
      callback(null, {organization, newProjects: res.values})
      if (res.nextPage) {
        await this.getPaginatedProjects(organization, res.nextPage, callback).catch(console.error)
      }
    }
  }

  async getProjects(organizations: string[], callback: GetProjectsCallback) {
    return Promise.all(
      organizations.map(async (organization) => {
        return this.getPaginatedProjects(
          organization,
          //`https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/project/search?orderBy=name`,
          `https://dev.azure.com/${organization}/_apis/projects?api-version=5.1`,
          callback
        ).catch(console.error)
      })
    )
  }

  async getProject(organization: string, projectId: string) {
    return this.get(
      //`https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/project/${projectId}`
      `https://dev.azure.com/${organization}/_apis/projects/${projectId}?api-version=5.1`
    ) as AzureDevopsProject | AzureDevopsError
  }

  // ADF => Atlassian Document Format
  // async convertMarkdownToADF (markdown: string) {
  //   return this.post('https://api.atlassian.com/pf-editor-service/convert?from=markdown&to=adf', {
  //     input: markdown
  //   }) as object
  // }

  async getCreateMeta(organization: string, projectKeys?: string[]) {
    let args = ''
    if (projectKeys) {
      args += `projectKeys=${projectKeys.join(',')}`
    }
    if (args.length) {
      args = '?' + args
    }
    return this.get(
      `https://api.atlassian.com/ex/jira/${organization}/rest/api/3/issue/createmeta${args}`
    ) as WorkItemCreateMetadata | AzureDevopsError | AzureBoardsError
  }

  // https://docs.microsoft.com/en-us/rest/api/azure/devops/wit/work%20items/create?view=azure-devops-rest-5.1
  async createWorkItem(organization: string, projectId: string, issueFields: CreateIssueFields) {
    const type = 'Task'
    const payload = {
      fields: {
        project: {
          key: projectId
        },
        ...issueFields
      } as CreateIssueFields
    }
    //dev.azure.com/{organization}/{project}/_apis/wit/workitems/${type}?api-version=5.1
    //return this.post(`https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue`, payload) as
    https: return this.post(
      `https://dev.azure.com/${organization}/${projectId}/_apis/wit/workitems/${type}?api-version=5.1`,
      payload
    ) as AzureDevopsCreateIssueResponse | AzureBoardsError
  }
}

export default AzureDevopsClientManager
