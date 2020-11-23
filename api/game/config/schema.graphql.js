const { update } = require('lodash');
const _ = require('lodash');

module.exports = {

  definition: `
  union GameUpdate = ComponentGameInfoUpdate | ComponentGameRegionUpdate | ComponentGameFundingUpdate | ComponentGameCompanyUpdate
  `,
  query: `
  gameHistory: [Game]
  `,
  mutation: `
  createSimpleGame: Game
  `,
  subscription: `
    onCustomSubscription(channel: String): String
    joinGame(company: ID game: ID!): [GameUpdate]
  `,
  resolver: {
    GameUpdate: {
      __resolveType(obj, context, info) {
        if (obj.__typename) {
          return obj.__typename;
        }
        return null;
      },
    },
    Query: {
      gameHistory: {
        policies: [],
        resolver: 'application::game.game.gameHistory',
      }
    },
    Mutation: {
      createSimpleGame: {
        policies: [],
        resolver: 'application::game.game.createSimpleGame',
      }
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
      },
      joinGame: {
        resolverOf: 'plugins::users-permissions.user.me',
        subscribe: async (obj, options, ctx) => {
          const { company: companyId, game: id } = options;
          console.log(`Joining game ${id}`);

          let game = await strapi.query('game').findOne({
            id,
          }, ['companies', 'fundings'])
          const userId = ctx.state.user.id;

          // console.log({
          //   user: ctx.state.user,
          //   game,
          //   companies: game.companies,
          // })

          if (!game) {
            throw new Error("Game does not exist");
          }
          const company = await strapi.query('company').findOne({
            id: companyId
          }, [])

          // console.log({
          //   company,
          //   userId,
          // })

          if (!company) {
            throw new Error("Company does not exist");
          }

          // console.log({
          //   companyUser: company.user,
          //   userId,
          // })
          if (company.user != userId) { // shadow equal for objectId and string
            throw new Error("Company does not belong to current user");
          }

          // console.log({
          //   obj,
          //   ctx,
          //   options,
          // });


          const updateParams = {
          }
          if (game.numCompanies === game.companies) {
            throw new Error("Number of companies exceed game limit.");
          }

          const newCompanies = game.companies;

          // If the user has not joined the game yet, add the user to the game
          if (_.findIndex(game.companies, ({ id }) => id.toString() === companyId) === -1) {
            console.log(`Company ${companyId} not found. Adding it to game ${game.id}`);
            newCompanies.push(companyId);
            updateParams.companies = newCompanies;
          }

          console.log(`Checking if game ${game.id} should start`, game.numCompanies, newCompanies.length, game.numCompanies === newCompanies.length);

          if (game.numCompanies === newCompanies.length) {
            updateParams.started = true;
          }

          game = await strapi.query('game').update({
            id: game.id,
          }, updateParams, ['companies', 'fundings', 'regions'])

          // console.log('Updated game', {
          //   game,
          // })

          if (!strapi.games[id]) {
            strapi.games[id] = game;
          }


          // setInterval(() => {
          //   strapi.graphql.pubsub.publish(options.channel, {
          //     onCustomSubscription: `Count: ${count}`
          //   });

          //   count++;
          // }, 1000);
          return await strapi.graphql.pubsub.asyncIterator(id)
        }
      }
    }
  },
};
