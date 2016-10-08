import React, {Component, PropTypes} from 'react';
import {findDOMNode} from 'react-dom';
import {cashay} from 'cashay';
import {reduxForm, initialize} from 'redux-form';
import labels from 'universal/styles/theme/labels';
import getOutcomeNames from 'universal/utils/getOutcomeNames';
import {actionFactories, binder} from 'universal/modules/outcomeCard/ducks/outcomeCardDuck';
import {connect} from 'react-redux';
import OutcomeCard from 'universal/modules/outcomeCard/components/OutcomeCard/OutcomeCard';
import {initializer} from 'universal/modules/outcomeCard/ducks/outcomeCardDuck';
import initializeComponent from 'universal/modules/outcomeCard/ducks/initializeComponent';
import targetIsDescendant from 'universal/utils/targetIsDescendant';

const outcomeCardAssignMenuQuery = `
query {
  teamMembers(teamId: $teamId) @live {
    id
    picture
    preferredName
  }
}
`;

const mapStateToProps = (state, props) => {
  const {form, outcome} = props;
  const {openArea, hasHover} = state.outcomeCard[form] || initialState;
  const formState = state.form[form];
  const active = formState && formState.active && form.endsWith(formState.active);
  const {id: outcomeId} = outcome;
  const [teamId] = outcomeId.split('::');
  const {teamMembers} = cashay.query(outcomeCardAssignMenuQuery, {
    op: 'outcomeCardAssignMenuContainer',
    key: teamId,
    variables: {teamId}
  }).data;
  return {
    active,
    openArea,
    hasHover,
    teamMembers
  };
};

const mapDispatchToProps = (dispatch, props) => binder(dispatch, actionFactories, props.form);


class OutcomeCardContainer extends Component {
  componentWillReceiveProps(nextProps) {
    const nextContent = nextProps.outcome.content;
    const {content} = this.props.outcome;
    if (nextContent !== content) {
      this.initializeValues(nextContent);
    }
  }

  componentWillUpdate(nextProps) {
    if (!this.props.active && nextProps.active) {
      document.addEventListener('click', this.handleDocumentClick);
    } else if (this.props.active && !nextProps.active) {
      setTimeout(() => document.removeEventListener('click', this.handleDocumentClick), 0);
    }
  }

  componentWillMount() {
    const {outcome: {content}} = this.props;
    if (content) {
      this.initializeValues(content);
    }
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.handleDocumentClick);
  }

  initializeValues(content) {
    const {dispatch, form, outcome: {id}} = this.props;
    dispatch(initialize(form, {[id]: content}));
  }

  handleCardActive = () => (isActive) => {
    const outcomeId = this.props.outcome.id;
    if (isActive === undefined) {
      return;
    }
    const [teamId] = outcomeId.split('::');
    const editing = isActive ? `Task::${outcomeId}` : null;
    const options = {
      variables: {
        teamId,
        editing
      }
    };
    cashay.mutate('edit', options);
  };

  handleCardUpdate = (submittedData) => {
    const {outcome} = this.props;
    const submittedContent = submittedData[outcome.id];
    if (!submittedContent) {
      const {argName, mutationName} = getOutcomeNames(outcome, 'delete');
      // delete blank cards
      cashay.mutate(mutationName, {variables: {[argName]: outcome.id}});
    } else {
      // TODO debounce for useless things like ctrl, shift, etc
      const {argName, mutationName} = getOutcomeNames(outcome, 'update');
      const options = {
        variables: {
          [argName]: {
            id: outcome.id,
            content: submittedContent
          }
        }
      };
      cashay.mutate(mutationName, options);
    }
  };

  handleDocumentClick = (e) => {
    // try to delete empty card unless they click inside the card
    if (!targetIsDescendant(e.target, findDOMNode(this))) {
      document.removeEventListener('click', this.handleDocumentClick);
      this.props.handleSubmit(this.handleCardUpdate)();
    }
  };

  render() {
    return (
      <OutcomeCard
        {...this.props}
        handleCardActive={this.handleCardActive}
        handleCardUpdate={this.handleCardUpdate}
      />

    );
  }
}

OutcomeCardContainer.propTypes = {
  outcome: PropTypes.shape({
    id: PropTypes.string,
    content: PropTypes.string,
    status: PropTypes.oneOf(labels.projectStatus.slugs),
    teamMemberId: PropTypes.string,
  }),
  dispatch: PropTypes.func.isRequired,
  form: PropTypes.string,
  editors: PropTypes.array,
  field: PropTypes.string,
  focus: PropTypes.func,
  hasOpenAssignMenu: PropTypes.bool,
  hasOpenStatusMenu: PropTypes.bool,
  isProject: PropTypes.bool,
  owner: PropTypes.object,
  teamMembers: PropTypes.array,
  updatedAt: PropTypes.instanceOf(Date),
  handleSubmit: PropTypes.func,
};

// Using decorators causes a fun bug where reduxForm can't find dispatch, so we do it the boring way
export default initializeComponent(initializer, 'form')(
  connect(mapStateToProps, mapDispatchToProps)(
    reduxForm()(OutcomeCardContainer)
  )
)
