import React from 'react'
import { Link } from 'react-router-dom'

const NoMatchPage = ({ location }) => (
  <div>
    <p>Sorry, no page found at {location.pathname}</p>
    <Link to="/">Go Home</Link>
  </div>
)

export default NoMatchPage
