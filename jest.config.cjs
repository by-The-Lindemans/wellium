module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  moduleDirectories: ['node_modules', 'src'],
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': 'ts-jest'
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(@ionic/react|@ionic/core|ionicons|react|react-dom|react-router-dom)/)'
  ],
  moduleNameMapper: {
    '\\.(css|scss)$': 'identity-obj-proxy'
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'] 
};
