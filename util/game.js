const {
  simpleGameFundings,
  simpleGameName,
  simpleGameNumCompanies,
  simpleGameWidth,
  simpleGameHeight,
  simpleGameNumCycles,
  simpleGameRegion,
  getAdjacentRegionIndex,
  simpleGameInitialUsers,
} = require('starting-up-common')

// console.log(
//   {
//     simpleGameFundings,
//     simpleGameName,
//     simpleGameNumCompanies,
//     simpleGameWidth,
//     simpleGameHeight,
//     simpleGameNumCycles
//   }
// )

/**
 * Create Fundings in a Simple Game
 * @param {ID} game Game ID for the Simple Game
 */
const createFundingsForSimpleGame = async () => {
  return await Promise.all(simpleGameFundings.map(strapi.services.funding.create));
}

/**
 * Create Regions in a Simple Game
 * @param {Number} width number of rows in the Terrian
 * @param {Number} height number of columns in the Terrian
 */
const createRegionsForSimpleGame = async (width = simpleGameWidth, height = simpleGameHeight) => {
  return await Promise.all(Array(width * height).fill(simpleGameRegion).map((_, index) => strapi.query('region').create({
    index,
    ...simpleGameRegion,
  })));
}


const initializeSinglePlayerGame = (game, companies, height, width, regions, regionUsers, revenues, newCycle, updates, initialUsers = simpleGameInitialUsers) => {
  const company = companies[0];
  const companyId = company.id.toString();
  const row = Math.ceil((height - 1) / 2);
  const column = Math.ceil((width - 1) / 2);
  const incubationRegion = _.find(regions, ({ index }) => index === row * width + column)

  const {
    update,
    id,
  } = incubationRegion;
  const regionId = id.toString();

  if (!('companyId' in regionUsers)) {
    regionUsers[companyId] = {};
  }

  // Init users and add user update
  regionUsers[companyId][regionId] = initialUsers;
  const regionUserUpdates = [{
    company: companyId,
    count: regionUsers[companyId][regionId],
  }];
  const newRegionUpdate = {
    __typename: "ComponentGameRegionUpdate",
    __component: "game.region-update",
    cycle: newCycle,
    region: regionId,
    RegionUserUpdate: regionUserUpdates,
  };
  update.push(newRegionUpdate);
  updates.push(newRegionUpdate);


  const newCompanyUpdate = {
    __typename: "ComponentGameCompanyUpdate",
    __component: "game.company-update",
    cycle: newCycle,
    CompanyUserUpdate: [{
      company: companyId,
      bankrupt: false,
      revenue: company.fund,
    }],
  };
  revenues[companyId] = company.fund;
  updates.push(newCompanyUpdate);
}

const updateCompanyRevenueForRegions = (regionUserRegions, regionUsers, companyId, revenues, companyMap) => _.values(regionUserRegions).forEach(({
  id,
  population,
  conversionRate,
  leavingRate,
  revenue,
  cost,
  growth,
  update,
  index,
}) => {
  const regionId = id.toString();
  if (!(regionId in regionUsers[companyId])) {
    return;
  }
  const count = regionUsers[companyId][regionId];
  if (!(companyId in revenues)) {
    revenues[companyId] = companyMap[companyId].fund;
  } else {
    revenues[companyId] = revenues[companyId] + count * revenue - (count > 0 ? cost : 0);
  }
  // console.log('updateCompanyRevenueForRegions', revenues);

})

function updateCompaniesRevenueForRegions(companies, regionUsers, regionMap, revenues, companyMap) {
  return companies.map(({ id }) => {
    const companyId = id.toString();
    if (!(companyId in regionUsers)) regionUsers[companyId] = {}
    console.log(companyId, regionUsers[companyId]);

    // Get the region ids from regionUsers
    const regionUserIds = Object.keys(regionUsers[companyId]);
    // Get the region objects from regionMap
    const regionUserRegions = _.pick(regionMap, regionUserIds);
    updateCompanyRevenueForRegions(regionUserRegions, regionUsers, companyId, revenues, companyMap)
  });
}

const computeValidRegionsForUpdate = (companies, companyStrategies, regionUsers, regionMap, companyRegions, regions, width, height) => companies.forEach((c) => {
  const companyId = c.id.toString();

  // Threshold is when the company can expand
  const threshold = companyStrategies[companyId];
  const regionUserIds = Object.keys(regionUsers[companyId]);
  const regionUserRegions = _.pick(regionMap, regionUserIds);

  console.log({
    companyStrategies,
    threshold,
  })

  _.values(regionUserRegions).forEach(({ id, population, index }) => {
    const regionId = id.toString();
    const numUsers = regionUsers[companyId][regionId] || 0;
    let rs = [...(companyRegions[companyId] || [])];
    // if ((numUsers > population * threshold) || true) {
    if ((numUsers > population * threshold)) {
      rs = [...rs, ...(_.filter(regions, ({ index: regionIndex }) => (_.includes(getAdjacentRegionIndex(index, width, height), regionIndex))).map(r => r.id.toString()))];
      // console.log('computing adjacent regions', index, companyRegions[companyId]);
    }

    // Add existing users
    if (numUsers > 0) {
      rs.push(regionId);
    }

    console.log({ rs });

    companyRegions[companyId] = new Set(rs);
  });
})

const fundingPhases = ['preseed', 'seed', 'seriesA', 'seriesB', 'seriesC'];

const updateCompanyStrategies = (companies, fundings, cycle, companyStrategies) => companies.forEach((c) => {
  const companyId = c.id.toString();
  const strategies = _.values(_.pick(c.strategy, fundingPhases));
  // console.log({ strategies });
  // Get current funding and threshold
  const sortedFunding = _.orderBy(fundings, ['cycle'], ['asc']);
  let threshold = strategies[0];
  for (let i = sortedFunding.length - 1; i >= 0; i--) {
    if (sortedFunding[i].cycle <= cycle) {
      threshold = strategies[i + 1];
      break;
    }
  }
  companyStrategies[companyId] = threshold;
})

const monteCarlo = (n, threshold) => _.filter(_.map(new Array(n), () => Math.random()), v => v < threshold).length;

const computeNewUsers = (users, population, conversionRate, leavingRate) => {

  let newUsers = users;
  // Compute leaving users
  if (users) {
    newUsers -= monteCarlo(users, leavingRate);
  }
  const delta = monteCarlo(population - users, conversionRate);

  if (delta === 0) {
  }

  newUsers += delta;
  // console.log({
  //   conversionRate,
  //   leavingRate,
  //   delta,
  //   newUsers,
  // });

  return newUsers
}

const calculateConversionRate = (baseRate, n) => baseRate * Math.sqrt((n + 1));
const calculateLeavingRate = (baseRate, n) => baseRate * 50 / (n || 1);

async function updateRegionUsers(populatedRegions, companies, companyRegions, regionUsers, newCycle, updates) {
  await Promise.all(populatedRegions.map(async ({
    id,
    population,
    conversionRate,
    leavingRate,
    growth,
    update,
    index,
  }) => {
    // Summarize users of each company based on latest update
    // TODO: memoize users for each region
    const regionId = id.toString();
    // console.log({
    //   RegionCompanyUpdate: regionCompanyUpdates,
    // });

    // Update region users
    const regionUserUpdates = _.filter(companies.map((c) => {
      const companyId = c.id.toString();
      console.log('companyRegions', companyRegions[companyId])
      if (companyRegions[companyId].has(regionId)) {
        const numUsers = regionUsers[companyId][regionId] || 0;
        // Computed conversion rate
        const adjustedConversionRate = calculateConversionRate(conversionRate, numUsers);
        const adjustedLeavingRate = calculateLeavingRate(leavingRate, numUsers);

        console.log({
          adjustedConversionRate,
          adjustedLeavingRate,
        })
        if (numUsers !== 0) {
          // regionUsers[companyId][regionId] = numUsers + 1;
          regionUsers[companyId][regionId] = computeNewUsers(numUsers, population, adjustedConversionRate, adjustedLeavingRate);
        } else {
          // console.log(`0 user in region ${regionId} of index ${index}`);
          const delta = computeNewUsers(numUsers, population, adjustedConversionRate, adjustedLeavingRate);
          if (delta > 0) {
            regionUsers[companyId][regionId] = delta;
          } else {
            regionUsers[companyId][regionId] = 0;
            return;
          }
        }

        const diff = regionUsers[companyId][regionId] - numUsers;

        if (diff !== 0) {
          return ({
            company: companyId,
            count: regionUsers[companyId][regionId] - numUsers,
          });
        }
      }
    }));

    // console.log({
    //   regionUserUpdates
    // })

    if (regionUserUpdates.length > 0) {
      const newRegionUpdate = {
        __typename: "ComponentGameRegionUpdate",
        __component: "game.region-update",
        cycle: newCycle,
        region: regionId,
        RegionUserUpdate: regionUserUpdates,
      };
      update.push(newRegionUpdate);
      updates.push(newRegionUpdate);
    }

    // await strapi.query('region').update({
    //   id,
    // }, {
    //   update,
    // });

  }));
}

function computeRevenueDiff(revenues, oldRevenues, companyMap, matchedFunding, newCycle, updates) {
  const companyUserUpdates = _.filter(Object.keys(revenues).map(cid => {

    const oldRevenue = oldRevenues[cid] || 0;
    let newRevenue = revenues[cid] || 0;
    if (!(cid in revenues)) {
      newRevenue = companyMap[cid].fund;
    }

    if (matchedFunding) {
      newRevenue = oldRevenue + matchedFunding.amount;
    }
    revenues[cid] = newRevenue
    const diff = newRevenue - oldRevenue;

    if (diff !== 0) {
      return ({
        company: cid,
        bankrupt: revenues[cid] < 0,
        revenue: diff,
      });
    }
  }));


  // Update company status
  const newCompanyUpdate = {
    __typename: "ComponentGameCompanyUpdate",
    __component: "game.company-update",
    cycle: newCycle,
    CompanyUserUpdate: companyUserUpdates,
  };
  updates.push(newCompanyUpdate);
}


module.exports = {
  simpleGameName,
  simpleGameNumCompanies,
  simpleGameWidth,
  simpleGameHeight,
  simpleGameNumCycles,
  simpleGameFundings,
  createFundingsForSimpleGame,
  createRegionsForSimpleGame,
  initializeSinglePlayerGame,
  updateCompanyRevenueForRegions,
  updateCompaniesRevenueForRegions,
  computeValidRegionsForUpdate,
  updateCompanyStrategies,
  updateRegionUsers,
  computeRevenueDiff,
}
