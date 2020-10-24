module.exports = {

  definition: `
  input SimpleStrategyInput {
    preseed: Float!
    seed: Float!
    seriesA: Float!
    seriesB: Float!
    seriesC: Float!
  }
  `,
  query: `
  `,
  mutation: `
  registerCompany(name: String! strategy: SimpleStrategyInput!): Company
  `,
  subscription: `
  `,
  resolver: {
    Query: {
    },
    Mutation: {
      registerCompany: {
        policies: [],
        resolver: 'application::company.company.createCompany',
      }
    },
    Subscription: {
    }
  },
};
