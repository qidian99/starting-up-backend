const { 
  simpleGameFundings, 
  simpleGameName,
  simpleGameNumCompanies,
  simpleGameWidth,
  simpleGameHeight,
  simpleGameNumCycles,
  simpleGameRegion,
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

module.exports = {
  simpleGameName,
  simpleGameNumCompanies,
  simpleGameWidth,
  simpleGameHeight,
  simpleGameNumCycles,
  simpleGameFundings,
  createFundingsForSimpleGame,
  createRegionsForSimpleGame,
}
