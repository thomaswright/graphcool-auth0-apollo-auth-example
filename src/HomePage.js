import React, { Component } from 'react'

/**___________________________________________________________________________*/

class HomePage extends Component {
  render() {
    return (
      <div>
        Welcome
        <button onClick={this.props.logout}>Logout</button>
      </div>
    )
  }
}

export default HomePage
