import React, { Component } from 'react';
import ApolloClient, { createNetworkInterface } from 'apollo-client'
import { ApolloProvider } from 'react-apollo'
import { BrowserRouter } from "react-router-dom";
import AuthRouter from './AuthRouter'

import {
  ENDPOINT,
  GRAPHCOOL_TOKEN_STORAGE_KEY
} from './constants'

const networkInterface = createNetworkInterface({
  uri: ENDPOINT
})

networkInterface.use([{
  applyMiddleware(req, next) {
    if (!req.options.headers) {
      req.options.headers = {};  // Create the header object if needed.
    }
    // get the authentication token from local storage if it exists
    req.options.headers.authorization = localStorage.getItem(GRAPHCOOL_TOKEN_STORAGE_KEY) || null;
    next();
  }
}]);

const client = new ApolloClient({ networkInterface })

class App extends Component {
  render() {
    return (
      <ApolloProvider client={client}>
        <BrowserRouter>
          <AuthRouter client={client}/>
        </BrowserRouter>
      </ApolloProvider>
    );
  }
}

export default App;
