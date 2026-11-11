module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',
    '!src/triggers.js',
    '!src/rovo.js',
    '!src/jira-api.js',
  ],
  testMatch: [
    '**/tests/**/*.test.js'
  ],
  verbose: true,
};
