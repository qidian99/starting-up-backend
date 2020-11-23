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
  myCompanies: [Company]
  `,
  mutation: `
  registerCompany(name: String! strategy: SimpleStrategyInput!): Company
  `,
  subscription: `
  `,
  resolver: {
    Query: {
      myCompanies: {
        policies: [],
        resolver: 'application::company.company.myCompanies',
      },
    },
    Mutation: {
      registerCompany: {
        policies: [],
        resolver: 'application::company.company.createCompany',
      },
    },
    Subscription: {
    }
  },
};
