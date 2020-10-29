'use strict';

const _ = require('lodash');

/**
 * An asynchronous bootstrap function that runs before
 * your application gets started.
 *
 * This gives you an opportunity to set up your data model,
 * run jobs, or perform some special logic.
 *
 * See more details here: https://strapi.io/documentation/v3.x/concepts/configurations.html#bootstrap
 */

module.exports = () => {
  // The global game instances. This is the master version of all the games
  strapi.games = {}
  setInterval(() => {
    Object.keys(strapi.games).forEach(gameId => {
      const game = strapi.games[gameId];
      const {
        started,
        numCycles,
        companies,
        fundings,
        regions,
        cycle,
      } = game;
      if (!started) {
        return;
      }
      const updates = [];
      
      // Update cycle
      const newCycle = cycle + 1;
      updates.push({
        __typename: "ComponentGameInfoUpdate",
        message: `Entering cycle ${newCycle}`,
        cycle: newCycle,
      })
      game.cycle = newCycle;
      
      // Update fundings, simple static logic for fixed cycles
      const orderedFundings = _.orderBy(fundings, ['cycle'], ['asc']);
      // Convert MongoDB long int to int: https://mongodb.github.io/node-mongodb-native/api-bson-generated/long.html
      const matchedFunding = _.find(orderedFundings, (f) => f.cycle.toInt() === newCycle);
      // console.log({
      //   orderedFundings,
      //   matchedFunding,
      // })
      if (matchedFunding) {
        console.log(`New funding in cycle ${newCycle}`, matchedFunding);

        updates.push({
          __typename: "ComponentGameFundingUpdate",
          cycle: newCycle,
          FundingUserUpdate: companies.map(c => ({
            company: c.id,
            funding: matchedFunding.id,
          })),
        });
      }

      // Reset all regions update when the game starts from cycle 0
      if (cycle === 0) {

      }

      // Update regions
      regions

      strapi.graphql.pubsub.publish(gameId, {
        joinGame: updates,
      });
    });
    // console.log(strapi.games);
  }, 1000);
};
