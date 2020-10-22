module.exports = {

  definition: `
  `,
  query: `
  `,
  mutation: `
  `,
  subscription: `
    onCustomSubscription(channel: String): String
  `,
  resolver: {
    Query: {
    },
    Mutation: {
    },
    Subscription: {
      onCustomSubscription: {
        //Resolver is used to get access policy. Failing to provide one, will end with 401 Forbiden
        resolverOf: 'plugins::users-permissions.user.me',
        subscribe: async (obj, options, { context }) => {

          let count = 0;

          setInterval(() => {
            strapi.graphql.pubsub.publish(options.channel, {
              onCustomSubscription: `Count: ${count}`
            });

            count++;
          }, 1000);

          return await strapi.graphql.pubsub.asyncIterator(options.channel)
        }
      }
    }
  },
};
