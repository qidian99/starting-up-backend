'use strict';

const { forEach } = require('lodash');
const _ = require('lodash');
const { getAdjacentRegionIndex } = require('starting-up-common');
const { initializeSinglePlayerGame, updateCompaniesRevenue, computeGrowthRegions, updateCompanyStrategies, updateCompanyRevenues, updateRegionUsers } = require('../../util/game');


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

  setInterval(async () => {
    Object.keys(strapi.games).forEach(async (gameId) => {
      const game = strapi.games[gameId];
      const {
        width,
        height,
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

      /* Check for game end */
      if (cycle >= numCycles) {
        delete strapi.games[gameId];
        strapi.graphql.pubsub.publish(gameId, {
          joinGame: [{
            __typename: "ComponentGameInfoUpdate",
            message: `Game ends`,
            cycle,
          }],
        });
        return;
      }

      /* Initialization of variables */
      const updates = [];

      if (!('companyMap' in game)) {
        game.companyMap = {}
        companies.forEach((c) => game.companyMap[c.id.toString()] = c);
      }

      if (!('revenues' in game)) {
        game.revenues = {};
      }

      if (!('regionUsers' in game)) {
        game.regionUsers = {};
      }

      if (!('orderedFundings' in game)) {
        game.orderedFundings = _.orderBy(fundings, ['cycle'], ['asc']);
      }

      if (!('regionMap' in game)) {
        const temp = {}
        regions.forEach((r) => {
          temp[r.id.toString()] = r;
        });
        game.regionMap = temp;
      }

      // Update fundings, simple static logic for fixed cycles
      const orderedFundings = game.orderedFundings;
      const companyMap = game.companyMap;
      const revenues = game.revenues;
      const regionUsers = game.regionUsers;
      const regionMap = game.regionMap;
      /* End of initialization of variables */

      // Update cycle
      const newCycle = cycle + 1;
      updates.push({
        __typename: "ComponentGameInfoUpdate",
        message: `Entering cycle ${newCycle}`,
        cycle: newCycle,
      })
      game.cycle = newCycle;

      // Convert MongoDB long int to int: https://mongodb.github.io/node-mongodb-native/api-bson-generated/long.html
      const matchedFunding = _.find(orderedFundings, (f) => f.cycle.toInt() === newCycle);

      try {
        // Reset all regions update when the game starts from cycle 0
        // Other initialization of the game also happen in cycle 0
        if (cycle === 0) {
          const regionIds = regions.map(({ id }) => id.toString());
          // console.log({
          //   regionIds
          // })
          await strapi.query('region').update({
            id: regionIds,
          }, {
            update: []
          });
          // console.log('Reset update for regions: ', regionIds);

          // Initialize initial funds and users
          if (companies.length === 1) { // one player game
            initializeSinglePlayerGame(game, companies, height, width, regions, regionUsers, newCycle, updates)
          }
        } else {
          // If we are in a new funding phase, increment the user's revenue by 
          // the amount of that funding.
          if (matchedFunding) {
            console.log(`New funding in cycle ${newCycle}`, matchedFunding);

            updates.push({
              __typename: "ComponentGameFundingUpdate",
              cycle: newCycle,
              FundingUserUpdate: companies.map(c => ({
                company: c.id.toString(),
                funding: matchedFunding.id,
              })),
            });
          }
          // console.log({ regionUsers });

          updateCompaniesRevenue(companies, regionUsers, regionMap, revenues, companyMap)

          // Update regions
          let companyRegions = {}; // Will be populated
          const companyStrategies = {}; // Will be populated

          updateCompanyStrategies(companies, fundings, cycle, companyStrategies)
          computeGrowthRegions(companies, companyStrategies, regionUsers, regionMap, companyRegions, regions, width, height);

          const populatedRegionIds = _.flatten(_.map(_.values(companyRegions), (set) => [...set]));
          const populatedRegions = _.values(_.pick(regionMap, populatedRegionIds));
          // console.log({
          //   ids: populatedRegionIds,
          //   regions: _.values(_.pick(regionMap, populatedRegionIds))
          // })
          await updateRegionUsers(populatedRegions, companies, companyRegions, regionUsers, newCycle, updates);

          // console.log(`Summary for regions`, regionUsers);

          updateCompanyRevenues(revenues, companyMap, matchedFunding, newCycle, updates)
        }
      } catch (e) {
        console.log("Game error: ", e)
      } finally {
        // Publish the updates
        strapi.graphql.pubsub.publish(gameId, {
          joinGame: updates,
        });
      }
    });
    // console.log(strapi.games);
  }, 1000);
};
