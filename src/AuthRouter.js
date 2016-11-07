import React, { Component, PropTypes } from 'react'
import { Match, Miss, Redirect } from 'react-router'
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

const MatchWhenAuthorized = ({
  component: Component,
  isAuthorized,
  componentProps,
  ...other
}) => (
  <Match
    {...other}
    render={(props) => (
      isAuthorized ?
      <Component
        {...props}
        {...componentProps}/> :
      <Redirect
        to={{
          pathname: '/signin',
          state: { from: props.location }
        }}/>
    )}/>
)

/**___________________________________________________________________________*/

const USER_ALREADY_EXISTS_ERROR_CODE = 3023

class AuthRouter extends Component {
  static propTypes = {
    client: PropTypes.object.isRequired,
    router: PropTypes.object.isRequired,
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
    this.setState({
      auth0Token: null,
      graphcoolToken: null,
    })
    localStorage.removeItem(AUTH0_TOKEN_STORAGE_KEY)
    localStorage.removeItem(GRAPHCOOL_TOKEN_STORAGE_KEY)
    this.props.client.resetStore()
    this.props.router.transitionTo('/signin')
  }
  onAuth0Login = (auth0Token, name) => {
    // set auth0 token in localstorage
    localStorage.setItem(AUTH0_TOKEN_STORAGE_KEY, auth0Token)
    // set to comp state to rerender
    this.setState({ auth0Token })
    // once authenticated, signin to graphcool
    this.signinGraphcool(auth0Token, name)
  }
  signinGraphcool = async (auth0Token, name) => {
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

    //  route to the home page
    this.props.router.transitionTo('/')
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
      <div>
        <MatchWhenAuthorized
          exactly
          pattern="/"
          component={HomePage}
          componentProps={{logout: this.logout}}
          isAuthorized={(
            this.state.auth0Token &&
            this.state.graphcoolToken &&
            !isTokenExpired(this.state.auth0Token)
          )}
          />
        <Match
          pattern="/signin"
          render={(props) => (
            <Auth0LoginPage
              clientId={CLIENT_ID}
              domain={DOMAIN}
              onAuth0Login={this.onAuth0Login}
              />
          )}/>
        <Miss component={NoMatchPage} />
      </div>
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
      id
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
        id
      }
    }
  }
`

const AuthRouterWithData =  graphql(createUser, {name: 'createUser'})(
  graphql(signinUser, {name: 'signinUser'})(AuthRouter)
)

export default AuthRouterWithData
