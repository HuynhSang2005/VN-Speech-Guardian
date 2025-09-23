import { defineConfig } from 'orval';

export default defineConfig({
  'vn-speech-guardian': {
    input: {
      target: '../gateway-nestjs/public/openapi.json',
    },
    output: {
      target: 'src/api/generated',
      schemas: 'src/schemas/generated',
      client: 'react-query',
      httpClient: 'fetch',
      baseUrl: process.env.VITE_API_BASE_URL || 'http://localhost:3001',
      override: {
        mutator: {
          path: './src/lib/api-client.ts',
          name: 'customInstance',
        },
        query: {
          useQuery: true,
          useMutation: true,
          signal: true,
          version: 5, // TanStack Query v5
          options: {
            staleTime: 30000,
            gcTime: 300000,
          },
        },
        operations: {
          // Tùy chỉnh tên operations theo naming convention của VN Speech Guardian
          GetSessions: 'useSessions',
          GetSessionById: 'useSession',
          CreateSession: 'useCreateSession',
          DeleteSession: 'useDeleteSession',
          GetSessionTranscripts: 'useSessionTranscripts',
          GetSessionDetections: 'useSessionDetections',
          GetStatsOverview: 'useStatsOverview',
          AuthClerk: 'useAuthClerk',
          GetAuthMe: 'useAuthMe',
          GetHealth: 'useHealth',
          GetMetrics: 'useMetrics',
        },
        requestOptions: true,
        useDates: true,
        useTypeOverInterfaces: false, // Sử dụng interfaces thay vì types cho consistency
        useNativeEnums: false, // Sử dụng union types thay vì enums cho tree-shaking
      },
    },
    hooks: {
      afterAllFilesWrite: [
        // Format generated files với prettier
        'prettier --write src/api/generated/**/*.ts',
        'prettier --write src/schemas/generated/**/*.ts',
      ],
    },
  },
  // Configuration cho Zod schemas generation
  'vn-speech-guardian-zod': {
    input: {
      target: '../gateway-nestjs/public/openapi.json',
    },
    output: {
      target: 'src/schemas/generated/zod-schemas.ts',
      client: 'zod',
      mode: 'single',
      override: {
        zod: {
          strict: {
            response: true,
            query: true,
            param: true,
            body: true,
          },
          generateEachHttpStatus: true,
          coerce: {
            response: false,
            body: false,
            param: false,
            query: false,
          },
        },
      },
    },
    hooks: {
      afterAllFilesWrite: [
        'prettier --write src/schemas/generated/zod-schemas.ts',
      ],
    },
  },
});