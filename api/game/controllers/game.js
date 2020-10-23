'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  async gameEntered(ctx) {
    console.log(gameEntered);
    console.log(ctx);
  },
  async createSimpleGame(ctx) {
    const game = await strapi.query('game').create();
    return game;
  }
};
