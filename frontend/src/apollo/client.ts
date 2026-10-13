import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';

// Railway-hosted backend. TODO(env): make this configurable per environment
// (local dev needs the emulator/LAN-IP address, not this public URL) once
// react-native-config or an equivalent is wired in.
const GRAPHQL_ENDPOINT = 'https://wardrobe-agent-production.up.railway.app/graphql';

export const apolloClient = new ApolloClient({
  link: new HttpLink({ uri: GRAPHQL_ENDPOINT }),
  cache: new InMemoryCache(),
});
