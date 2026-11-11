// GraphQL documents. Every field/argument below appears in https://developers.buffer.com/reference.

export const Q_ACCOUNT = /* GraphQL */ `
  query Account {
    account { id email name organizations { id name } }
  }`;

export const Q_CHANNELS = /* GraphQL */ `
  query Channels($organizationId: OrganizationId!) {
    channels(input: { organizationId: $organizationId }) {
      id name displayName service isDisconnected isLocked avatar
    }
  }`;

export const Q_POSTS = /* GraphQL */ `
  query Posts($organizationId: OrganizationId!, $first: Int, $after: String, $filter: PostsFiltersInput) {
    posts(first: $first, after: $after, input: {
      organizationId: $organizationId, filter: $filter, sort: [{ field: dueAt, direction: asc }]
    }) {
      edges { node { id text status dueAt channelId channelService createdAt updatedAt } }
      pageInfo { hasNextPage endCursor }
    }
  }`;

export const Q_POST = /* GraphQL */ `
  query PostById($id: PostId!) {
    post(input: { id: $id }) { id text status dueAt channelId }
  }`;

export const M_EDIT_POST = /* GraphQL */ `
  mutation EditPost($input: EditPostInput!) {
    editPost(input: $input) {
      __typename
      ... on PostActionSuccess { post { id text status dueAt updatedAt } }
      ... on MutationError { message }
    }
  }`;

export interface BufferOrg { id: string; name: string }
export interface BufferChannel {
  id: string; name: string; displayName: string | null; service: string;
  isDisconnected: boolean; isLocked: boolean; avatar: string | null;
}
export interface BufferPost {
  id: string; text: string; status: string; dueAt: string | null;
  channelId: string; channelService: string; createdAt: string; updatedAt: string;
}
