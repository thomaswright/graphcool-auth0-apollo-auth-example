import React, { Component, PropTypes } from 'react'
import { withRouter, Route, Redirect, Switch } from 'react-router-dom'
import { graphql } from 'react-apollo';
import gql from 'graphql-tag';
import { isTokenExpired } from './jwtHelper'

import {
  GRAPHCOOL_TOKEN_STORAGE_KEY,
  AUTH0_TOKEN_STORAGE_KEY,
  CLIENT_ID,
  DOMAIN,
} from './constants'

import HomePage from './HomePage'
import NoMatchPage from './NoMatchPage'
import Auth0LoginPage from './Auth0LoginPage'

/**___________________________________________________________________________*/

// const MatchWhenAuthorized = ({
//   component: Component,
//   isAuthorized,
//   componentProps,
//   ...other
// }) => (
//   <Match
//     {...other}
//     render={(props) => (
//       isAuthorized ?
//       <Component
//         {...props}
//         {...componentProps}/> :
//       <Redirect
//         to={{
//           pathname: '/signin',
//           state: { from: props.location }
//         }}/>
//     )}/>
// )

const ProtectedRoute = ({ component: Component, isAuthorized, logout, ...rest }) => (
  <Route
    {...rest}
    render={props => {
      return isAuthorized
        ? <Component logout={logout} />
        : <Redirect to={`/signin`} />;
    }}
  />
);

/**___________________________________________________________________________*/

const USER_ALREADY_EXISTS_ERROR_CODE = 3023

class AuthRouter extends Component {
  static propTypes = {
    match: PropTypes.object.isRequired,
    location: PropTypes.object.isRequired,
    history: PropTypes.object.isRequired,
    client: PropTypes.object.isRequired,
    createUser: PropTypes.func.isRequired,
    signinUser: PropTypes.func.isRequired,
  }
  constructor(props) {
    super(props)
    this.state = {
      auth0Token: localStorage.getItem(AUTH0_TOKEN_STORAGE_KEY),
      graphcoolToken: localStorage.getItem(GRAPHCOOL_TOKEN_STORAGE_KEY),
    }
  }
  logout = () => {
    console.log("Logging out!");
    this.setState({
      auth0Token: null,
      graphcoolToken: null,
    })
    localStorage.removeItem(AUTH0_TOKEN_STORAGE_KEY)
    localStorage.removeItem(GRAPHCOOL_TOKEN_STORAGE_KEY)
    this.props.client.resetStore()
    // the push prop is passed from withRouter and corresponds to a history push
    this.props.history.push('/signin')
  }
  onAuth0Login = (auth0Token, name) => {
    console.log("Got the auth0 token");
    // set auth0 token in localstorage
    localStorage.setItem(AUTH0_TOKEN_STORAGE_KEY, auth0Token)
    // set to comp state to rerender
    this.setState({ auth0Token })
    // once authenticated, signin to graphcool
    this.signinGraphcool(auth0Token, name)
  }
  signinGraphcool = async (auth0Token, name) => {
    console.log("Signing into Graphcool");
    // create user if necessary
    try {
      await this.props.createUser({
        variables: {authToken: auth0Token, name: name}
      })
    } catch (e) {
      if (
        !e.graphQLErrors ||
        e.graphQLErrors[0].code !== USER_ALREADY_EXISTS_ERROR_CODE
      ) {
        throw e
      }
    }

    // sign in user
    const signinResult = await this.props.signinUser({
      variables: {authToken: auth0Token}
    })

    // set graphcool token in localstorage
    localStorage.setItem(GRAPHCOOL_TOKEN_STORAGE_KEY, signinResult.data.signinUser.token)
    this.setState({ graphcoolToken: signinResult.data.signinUser.token })

    // clear client store in case any session data from other users
    this.props.client.resetStore()

    // route to the home page
    // the push prop is passed from withRouter and corresponds to a history push
    this.props.history.push('/')
  }
  render() {
    /**
    1. tokens are not set -> isAuthorized is false -> redirects to '/signin'
    2. Auth0LoginPage renders, users clicks on button to login, and logs in
    3. auth0 token is set and user is signed into graphcool (if necessary user
         is created), graphcool auth token is set, and we redirect to '/'
    4. both tokens are set and token shouldn't be expired -> isAuthorized is
         true -> we render the HomePage
    */
    return (
      <Switch >
        <Route
          path="/signin(/)?"
          render={ _ => (
            <Auth0LoginPage
              clientId={CLIENT_ID}
              domain={DOMAIN}
              onAuth0Login={this.onAuth0Login}
              />
          )}/>
          <ProtectedRoute
            path="(/)?"
            exact
            component={HomePage}
            logout={this.logout}
            isAuthorized={(
              this.state.auth0Token &&
              this.state.graphcoolToken &&
              !isTokenExpired(this.state.auth0Token)
            )}
          />
        <Route component={NoMatchPage} />
      </Switch>
    )
  }
}

const createUser = gql`
  mutation createUser($authToken: String!, $name: String){
    createUser(
      authProvider: {
        auth0: {
          idToken: $authToken,
        }
      },
      name: $name
    ) {
      id,
      auth0UserId
    }
  }
`

const signinUser = gql`
  mutation signinUser($authToken: String!){
    signinUser(
      auth0: {
        idToken: $authToken
      }
    ) {
      token
      user {
        id,
        auth0UserId
      }
    }
  }
`

const AuthRouterWithData =  graphql(createUser, {name: 'createUser'})(
  graphql(signinUser, {name: 'signinUser'})(AuthRouter)
)

const AuthRouterWithDataAndRouter = withRouter(AuthRouterWithData)

export default AuthRouterWithDataAndRouter
