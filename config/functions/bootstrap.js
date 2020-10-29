'use strict';

const { forEach } = require('lodash');
const _ = require('lodash');
const { getAdjacentRegionIndex } = require('starting-up-common');


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

      if (cycle === numCycles) {
        delete strapi.games[gameId];
        return;
      }

      const updates = [];

      const companyMap = {}
      companies.forEach((c) => companyMap[c.id.toString()] = c);

      if (!('revenues' in game)) {
        game.revenues = {};
      }
      const revenues = game.revenues;


      if (!('regionUsers' in game)) {
        game.regionUsers = {};
      }
      const regionUsers = game.regionUsers;


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
            company: c.id.toString(),
            funding: matchedFunding.id,
          })),
        });
      }

      // Reset all regions update when the game starts from cycle 0
      if (cycle === 0) {
        const regionIds = regions.map(({ id }) => id);
        await strapi.query('region').update({
          id_in: regionIds,
        }, {
          update: []
        });
        console.log('Reset update for regions: ', regionIds);
      }

      regions.forEach(async ({
        id,
        population,
        conversionRate,
        leavingRate,
        revenue,
        cost,
        growth,
        update,
        game,
        index,
      }) => {
        // Summarize users of each company based on latest update
        // TODO: memoize users for each region
        let users = {};
        const regionId = id.toString();

        for (let i = update.length - 1; i >= 0; i--) {
          const regionUpdate = update[i];

          const {
            RegionUserUpdate
          } = regionUpdate;

          // console.log({
          //   RegionUserUpdate,
          // })

          RegionUserUpdate.forEach(({
            company,
            count
          }) => {
            const companyId = typeof company === 'string' ? company : company.id.toString();
            if (companyId in users) {
              return;
            }

            users[companyId] = count;

            // Update revenue
            if (!(companyId in revenues)) {
              revenues[companyId] = companyMap[companyId].fund;
            } else {
              revenues[companyId] = revenues[companyId] + count * revenue - cost;
              // console.log('Updating revenue', revenues[companyId]);
            }

            if (!(companyId in regionUsers)) {
              regionUsers[companyId] = {};
            }
            regionUsers[companyId][regionId] = count

          });

          if (Object.keys(users).length === companies.length) {
            break;
          }
        }
      });

      console.log({
        regionUsers
      })

      // Update regions
      try {
        await Promise.all(regions.map(async ({
          id,
          population,
          conversionRate,
          leavingRate,
          revenue,
          cost,
          growth,
          update,
          game,
          index,
        }) => {
          // Summarize users of each company based on latest update
          // TODO: memoize users for each region
          const regionId = id.toString();

          // console.log({
          //   RegionCompanyUpdate: regionCompanyUpdates,
          // });

          // Update region users
          const regionUserUpdates = companies.map((c) => {
            const companyId = c.id.toString();
            if (!(companyId in regionUsers)) {
              regionUsers[companyId] = {};
            }
            const numUsers = regionUsers[companyId][regionId] || 0;
            // const adjacentRegions = getAdjacentRegionIndex()
            if (numUsers !== 0) {
              regionUsers[companyId][regionId] = numUsers + 1;
            } else {
              regionUsers[companyId][regionId] = 1;
            }

            return ({
              company: companyId,
              count: regionUsers[companyId][regionId],
            })
          });

          // console.log({
          //   regionUserUpdates
          // })

          const newRegionUpdate = {
            __typename: "ComponentGameRegionUpdate",
            cycle: newCycle,
            region: regionId,
            RegionUserUpdate: regionUserUpdates,
          };
          update.push(newRegionUpdate);

          // await strapi.query('region').update({
          //   id,
          // }, {
          //   update,
          // });

          updates.push(newRegionUpdate);
        }));

        // console.log(`Summary for regions`, regionUsers);

        const companyUserUpdates = Object.keys(revenues).map(cid => {
          if (!(cid in revenues)) {
            revenues[cid] = companyMap[cid].fund;
          }
          // console.log({
          //   c: companyMap[cid],
          //   revenue: revenues[cid],
          // })
          return ({
            company: cid,
            bankrupt: revenues[cid] < 0,
            revenue: revenues[cid]
          })
        });

        // Update company status
        const newCompanyUpdate = {
          __typename: "ComponentGameCompanyUpdate",
          cycle: newCycle,
          CompanyUserUpdate: companyUserUpdates,
        };
        updates.push(newCompanyUpdate);

        strapi.graphql.pubsub.publish(gameId, {
          joinGame: updates,
        });

      } catch (e) {
        console.log("Update regions error: ", e)
      }
    });
    // console.log(strapi.games);
  }, 1000);
};
