export const Config = {



 Base_url: 'https://api.dwellproperties.ai/api',
NODE_API_BASE_URL: 'https://api.dwellproperties.ai/api',
  API_URL: 'https://3hc254p0l3.execute-api.us-east-1.amazonaws.com/prod/auth',
  COGNITO_REGION: 'us-east-1',
  COGNITO_CLIENT_ID: '4vq7alk8e8uu9ajt3hh4tassk2',
  COGNITO_IDP_URL: 'https://cognito-idp.us-east-1.amazonaws.com/',
  CHAT_API_URL: 'https://lugv3mp9l6.execute-api.us-east-1.amazonaws.com/chat',
  PROPERTIES_API_URL: 'https://70q2ntiu1f.execute-api.us-east-1.amazonaws.com/prod/properties',

  // Maintenance Authorization API
  MAINTENANCE_API_URL: 'https://mo4vh9rkai.execute-api.us-east-1.amazonaws.com/prod/maintenance',
  maintenance_url: 'https://mo4vh9rkai.execute-api.us-east-1.amazonaws.com/prod/maintenance',

  // ✅ FIXED: Only store the BASE URL and KEY separately — never build dynamic
  //           URLs with template literals inside a static config object.
  //           The full URL is constructed at call-time in services.js.
  GOOGLE_MAPS_BASE_URL: 'https://maps.googleapis.com/maps/api/geocode/json',
  GOOGLE_MAPS_API_KEY: 'AIzaSyAwJzzG3VbyVTA0vEmKVQy7Ga15UYFJqGo',

  USER_SERVICE: {
    TOKEN_URL: '/oauth2/token',
  },

  // Gemini AI
  GEMINI_API_KEY: 'AQ.Ab8RN6JDrgSGiS1YJ6GJEl08RUV2oi1VviFQPtRyp2y2jiemaQ',
  GEMINI_API_URL: 'https://aiplatform.googleapis.com/v1/publishers/google/models/gemini-2.5-flash-lite:generateContent',

  // Feature flags
  ENABLE_IMAGE_ANALYSIS: true,
  ENABLE_AI_SUGGESTIONS: true,
  ENABLE_FALLBACK_AI: true,

  // Timeout settings (ms)
  PRIMARY_API_TIMEOUT: 30000,
  GEMINI_API_TIMEOUT: 45000,
  SUGGESTION_TIMEOUT: 15000,

  ENDPOINTS: {
    SIGN_UP: 'AWSCognitoIdentityProviderService.SignUp',
    CONFIRM_SIGN_UP: 'AWSCognitoIdentityProviderService.ConfirmSignUp',
    INITIATE_AUTH: 'AWSCognitoIdentityProviderService.InitiateAuth',
    CHAT: '/chat',
    MAINTENANCE: '/maintenanceAuthorization',
  },

  // Common Headers
  HEADERS: {
    CONTENT_TYPE: 'application/x-amz-json-1.1',
    JSON_CONTENT_TYPE: 'application/json',
  },

};
