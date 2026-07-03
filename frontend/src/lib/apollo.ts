import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  from,
  fromPromise,
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { tokenStore } from './token';

const GRAPHQL_URL =
  import.meta.env.VITE_GRAPHQL_URL ?? 'http://localhost:3000/graphql';

const httpLink = createHttpLink({ uri: GRAPHQL_URL });

const authLink = setContext((_, { headers }) => {
  const token = tokenStore.getAccess();
  return {
    headers: {
      ...headers,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  };
});

let isRefreshing = false;
let pendingResolvers: ((token: string | null) => void)[] = [];

const resolvePending = (token: string | null) => {
  pendingResolvers.forEach((resolve) => resolve(token));
  pendingResolvers = [];
};

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = tokenStore.getRefresh();
  if (!refreshToken) return null;
  try {
    const res = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `mutation Refresh($input: RefreshTokenInput!) {
          refreshToken(input: $input) { accessToken refreshToken }
        }`,
        variables: { input: { refreshToken } },
      }),
    });
    const json = await res.json();
    const data = json?.data?.refreshToken;
    if (data?.accessToken) {
      tokenStore.set(data.accessToken, data.refreshToken);
      return data.accessToken;
    }
    return null;
  } catch {
    return null;
  }
}

const errorLink = onError(({ graphQLErrors, operation, forward }) => {
  const unauthenticated = graphQLErrors?.some(
    (e) =>
      e.extensions?.code === 'UNAUTHENTICATED' ||
      /unauthorized/i.test(e.message),
  );
  if (!unauthenticated) return;
  if (operation.operationName === 'Refresh') return;

  if (!isRefreshing) {
    isRefreshing = true;
    return fromPromise(
      refreshAccessToken().then((token) => {
        isRefreshing = false;
        resolvePending(token);
        if (!token) {
          tokenStore.clear();
          window.location.href = '/login';
        }
        return token;
      }),
    ).flatMap((token) => {
      if (!token) return forward(operation);
      operation.setContext(({ headers = {} }) => ({
        headers: { ...headers, authorization: `Bearer ${token}` },
      }));
      return forward(operation);
    });
  }

  return fromPromise(
    new Promise<string | null>((resolve) => pendingResolvers.push(resolve)),
  ).flatMap((token) => {
    if (token) {
      operation.setContext(({ headers = {} }) => ({
        headers: { ...headers, authorization: `Bearer ${token}` },
      }));
    }
    return forward(operation);
  });
});

export const apolloClient = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: { fetchPolicy: 'cache-and-network' },
  },
});
