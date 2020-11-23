'use strict';
const {
  simpleGameName,
  simpleGameNumCompanies,
  simpleGameWidth,
  simpleGameHeight,
  simpleGameNumCycles,
  simpleGameFundings,
  createFundingsForSimpleGame,
  createRegionsForSimpleGame,
} = require("../../../util/game");

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  async gameHistory(ctx) {
    const userId = ctx.state.user.id;
    const companies = await strapi.query('company').find({
      user: userId
    }, []);
    // console.log("companies", companies)

    // const games = await strapi.query('game').model.find({});
    const games = await strapi.query('game').find({
      companies_in: _.map(companies, 'id'),
    }, []);

    console.log("games", games)
    return games;

  },
  async gameEntered(ctx) {
    console.log(gameEntered);
    console.log(ctx);
  },
  async createSimpleGame(ctx) {
   
    const fundings = await createFundingsForSimpleGame();
    const regions = await createRegionsForSimpleGame();
    console.log({
      fundings,
      regions,
    })
    const game = await strapi.query('game').create({
      name: simpleGameName,
      numCompanies: simpleGameNumCompanies,
      width: simpleGameWidth,
      height: simpleGameHeight,
      numCycles: simpleGameNumCycles,
      fundings: fundings.map(({ id }) => id),
      regions: regions.map(({ id }) => id),
      companies: [],
    });
    return game;
  }
};
