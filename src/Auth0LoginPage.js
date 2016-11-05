import React, { Component, PropTypes } from 'react'
import Auth0Lock from 'auth0-lock'

class Auth0LoginPage extends Component {
  static propTypes = {
    clientId: PropTypes.string.isRequired,
    domain: PropTypes.string.isRequired,
    onAuth0Login: PropTypes.func.isRequired,
  }
  constructor (props) {
    super(props)
    this.lock = new Auth0Lock(props.clientId, props.domain)
  }
  componentDidMount () {
    this.lock.on('authenticated', (authResult) => {
      this.lock.getProfile(authResult.idToken, (error, profile) => {
        if (error) {
          // TODO: improve error handling
          console.log("Error fetching profile: ", error);
        }
        this.props.onAuth0Login(authResult.idToken, profile.name)
      })
    })
  }
  showLogin = () => {
    this.lock.show()
  }
  render() {
    return (
      <button onClick={this.showLogin}>Login</button>
    )
  }
}

export default Auth0LoginPage
