import { createAsyncThunk } from '@reduxjs/toolkit';
import Toast from 'react-native-simple-toast';
import { Config } from '../../config';
import { navigate, resetRoot } from '../../navigation/RouterServices';

import { clearLoginData } from './loginSlice';
import { Buffer } from 'buffer';

// const navigation = useNavigation();
const base_url = Config.Base_url;



export const login = createAsyncThunk(
  'loginSlice/login',
  async (post, { rejectWithValue }) => {
    const url = `${base_url}/login`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: post?.email || post?.username,
          password: post?.password,
        }),
      });

      const data = await response.json();

      if (response.ok && data?.accessToken) {
        Toast.show('Login successfully');

          console.log(data.accessToken, "fsdfghjgf");
        // DECODE THE ID TOKEN TO GET USER INFO
        let landlordId = null;
        let tenantId = null;
        let contractorId = null;
        let role = 'tenant';
        let email = '';
        let firstName = '';
        let lastName = '';
        let phoneNumber = '';
          let isFirstLogin = false;

        if (data.idToken) {
          try {
            // Decode JWT token (it's base64 encoded)
            const tokenParts = data.idToken.split('.');
            const payload = JSON.parse(
              Buffer.from(tokenParts[1], 'base64').toString()
            );
            
            console.log('🔓 Decoded Token Payload:', payload);

            // Extract user data from token
            email = payload.email || '';
            firstName = payload.given_name || '';
            lastName = payload.family_name || '';
            phoneNumber = payload.phone_number || '';
            role = payload['custom:role'] || 'tenant';
            landlordId = payload['custom:landlordId'] || null;
            tenantId = payload['custom:tenantId'] || null;
            contractorId = payload['custom:contractorId'] || null;
              isFirstLogin =
                payload['custom:isFirstLogin'] === 'true' ||
                payload['custom:isFirstLogin'] === true ||
                data?.isFirstLogin === true ||
                data?.isFirstLogin === 'true';
        
            if (!landlordId && !tenantId && !contractorId) {
              const groups = payload['cognito:groups'] || [];
                if (groups.includes('admin')) {
                  role = 'admin';
                    
                } else if(groups.includes('landlord')) {
    
                landlordId = payload.sub;
                role = 'landlord';
               
              } else if (groups.includes('tenant')) {
                tenantId = payload.sub;
                role = 'tenant';
              } else if (groups.includes('contractor')) {
                contractorId = payload.sub;
                role = 'contractor';
              }
            }
          } catch (decodeError) {
            console.error('❌ Error decoding token:', decodeError);
          }
        }

        const userData = {
          accessToken: data.accessToken,
          idToken: data.idToken,
          refreshToken: data.refreshToken,
          landlordId: landlordId,
          tenantId: tenantId,
          contractorId: contractorId,
          role: role,
          email: email,
          firstName: firstName,
          lastName: lastName,
          phoneNumber: phoneNumber,
          isFirstLogin: isFirstLogin,
        };

        console.log('✅ Final userData:', userData);

        // Navigate based on role/IDs
        setTimeout(() => {
            if (role === 'admin') {
            resetRoot('AdminDashboard');
            } else if(tenantId) {
            resetRoot('BottomFotter');
          } else if (landlordId) {
            resetRoot('ProfileFooter');
          } else if (contractorId) {
              if (isFirstLogin) {
                  resetRoot('Welcome');
              }else {
                  resetRoot('ContractorHome');
                }
              
          } else {
            console.log(' Navigating to: BottomFotter (Default)');
            resetRoot('BottomFotter');
          }
        }, 300);

        return userData;
      } else {
        const errorMessage = data?.message || data?.error || 'Invalid credentials';
        Toast.show(errorMessage);
        return rejectWithValue(errorMessage);
      }
    } catch (err) {
      console.error('Login error:', err);
      Toast.show('Oops, there seems to be an error');
      return rejectWithValue(err.message || 'Oops, there seems to be an error');
    }
  }
);



export const registerUser = createAsyncThunk(
  'loginSlice/registerUser',
  async (userData, { rejectWithValue }) => {
    const url = `${base_url}/register`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userData.email,
          password: userData.password,
          firstName: userData.firstName,
          lastName: userData.lastName,
          phoneNumber: userData.phoneNumber,
          role: userData.role || 'tenant',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Toast.show('Registration successful! Please check your email for verification code.');
          console.log('Register response status:', response.status);
          console.log('Register response data:', data);
        return {
          ...data,
          email: userData.email,
        };
      } else {
        const errorMessage = data?.message || data?.error || 'Registration failed';
        Toast.show(errorMessage);
        return rejectWithValue(errorMessage);
      }
    } catch (err) {
      console.error('Registration error:', err);
      Toast.show('Oops, there seems to be an error during registration');
      return rejectWithValue(err.message || 'Oops, there seems to be an error');
    }
  }
);



export const submitContractorServices = createAsyncThunk(
  'contractor/submitContractorServices',
  async (params, { rejectWithValue }) => {
    const url = `${base_url}/contractor/services`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${params.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          services: params.services,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // ✅ Update isFirstLogin to false directly in Cognito from frontend
        try {
          const cognitoResponse = await fetch(
            'https://cognito-idp.us-east-1.amazonaws.com/',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-amz-json-1.1',
                'X-Amz-Target': 'AmazonCognitoIdentityProviderService.UpdateUserAttributes',
              },
              body: JSON.stringify({
                AccessToken: params.token,  // ← your accessToken
                UserAttributes: [
                  { Name: 'custom:isFirstLogin', Value: 'false' },
                ],
              }),
            }
          );
          const cognitoData = await cognitoResponse.json();
          console.log('✅ Cognito isFirstLogin updated to false:', cognitoData);
        } catch (cognitoErr) {
          console.warn('⚠️ Could not update Cognito attribute:', cognitoErr);
        }

        return {
          selectedServices: params.services,
          response: data,
        };
      } else {
        return rejectWithValue(data?.message || 'Failed to submit services');
      }
    } catch (err) {
      return rejectWithValue('Network error');
    }
  }
);

export const submitContractorServicesss = createAsyncThunk(
  'contractor/submitContractorServices',
  async (params, { rejectWithValue }) => {
    const url = `${base_url}/contractor/services`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${params.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          services: params.services  // Send selected
        }),
      });

      const data = await response.json();

      if (response.ok) {
          try {
             const cognitoResponse = await fetch(
               'https://cognito-idp.us-east-1.amazonaws.com/',
               {
                 method: 'POST',
                 headers: {
                   'Content-Type': 'application/x-amz-json-1.1',
                   'X-Amz-Target': 'AmazonCognitoIdentityProviderService.UpdateUserAttributes',
                 },
                 body: JSON.stringify({
                   AccessToken: params.token,
                   UserAttributes: [
                     { Name: 'custom:isFirstLogin', Value: 'false' },
                   ],
                 }),
               }
             );

             // ✅ ADD THESE LOGS to see what's happening
             console.log('🔵 Cognito response status:', cognitoResponse.status);
             const cognitoData = await cognitoResponse.json();
             console.log('🔵 Cognito response body:', JSON.stringify(cognitoData));

           } catch (cognitoErr) {
             console.warn('⚠️ Cognito update error:', cognitoErr);
           }
        return {
          selectedServices: params.services,
          response: data
        };
      } else {
        return rejectWithValue(data?.message || 'Failed to submit services');
      }
    } catch (err) {
      return rejectWithValue('Network error');
    }
  }
);




// Confirm OTP/Verification
export const confirmSignUp = createAsyncThunk(
  'loginSlice/confirmSignUp',
  async (otpData, { rejectWithValue }) => {
    const url = `${base_url}/confirm`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: otpData.email,
          code: otpData.otpCode,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Toast.show('Email verification successful! You can now login.');
//        navigate('Login');
          navigate('Terms&Conditions', { userType: otpData.role || 'tenant' });
        return data;
      } else {
        const errorMessage = data?.message || data?.error || 'OTP verification failed';
        Toast.show(errorMessage);
        return rejectWithValue(errorMessage);
      }
    } catch (err) {
      console.error('OTP verification error:', err);
      Toast.show('Oops, there seems to be an error during verification');
      return rejectWithValue(err.message || 'Oops, there seems to be an error');
    }
  }
);


// Refresh Token
export const refreshToken = createAsyncThunk(
  'loginSlice/refreshToken',
  async (params, { rejectWithValue }) => {
    const url = `${base_url}/refresh`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${params.accessToken}`,
        },
        body: JSON.stringify({
          refreshToken: params.refreshToken,
        }),
      });

      const data = await response.json();

      if (response.ok && data?.accessToken) {
        return {
          accessToken: data.accessToken,
          idToken: data.idToken,
          refreshToken: data.refreshToken,
        };
      } else {
        const errorMessage = data?.message || data?.error || 'Token refresh failed';
        return rejectWithValue(errorMessage);
      }
    } catch (err) {
      console.error('Token refresh error:', err);
      return rejectWithValue(err.message || 'Token refresh failed');
    }
  }
);

// Forgot Password - Send Reset Code
export const forgotPassword = createAsyncThunk(
  'loginSlice/forgotPassword',
  async (params, { rejectWithValue }) => {
    const url = `${base_url}/forgot-password`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: params.email,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Toast.show(data?.message || 'Reset code sent to your email');
        return data;
      } else {
        const errorMessage = data?.message || data?.error || 'Failed to send reset code';
        Toast.show(errorMessage);
        return rejectWithValue(errorMessage);
      }
    } catch (err) {
      console.error('Forgot password error:', err);
      Toast.show('Oops, there seems to be an error');
      return rejectWithValue(err.message || 'Oops, there seems to be an error');
    }
  }
);

// Confirm Reset Password
export const confirmForgotPassword = createAsyncThunk(
  'loginSlice/confirmForgotPassword',
  async (params, { rejectWithValue }) => {
    const url = `${base_url}/confirm-forgot`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: params.email,
          code: params.code,
          newPassword: params.newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Toast.show(data?.message || 'Password reset successful');
        navigate('Login');
        return data;
      } else {
        const errorMessage = data?.message || data?.error || 'Failed to reset password';
        Toast.show(errorMessage);
        return rejectWithValue(errorMessage);
      }
    } catch (err) {
      console.error('Confirm forgot password error:', err);
      Toast.show('Oops, there seems to be an error');
      return rejectWithValue(err.message || 'Oops, there seems to be an error');
    }
  }
);

// Logout
export const logout = createAsyncThunk(
  'loginSlice/logout',
  async (params, { dispatch, rejectWithValue }) => {
    try {
      // Clear all local data
      dispatch(clearLoginData());
        
      // Navigate to login screen
      resetRoot('Login');
      Toast.show('Logged out successfully');
      
      return true;
    } catch (err) {
      console.error('Logout error:', err);
      
      // Even if there's an error, clear local data and navigate
      dispatch(clearLoginData());
        dispatch(resetAIState());
      resetRoot('Login');
      Toast.show('Logged out successfully');
      
      return true;
    }
  }
);



export const associateLogin = createAsyncThunk(
  'loginSlice/associateLogin',
  async (params, { rejectWithValue }, thunkAPI) => {
    let url = base_url + Config.USER_SERVICE.ASSOCIATE_LOGIN;
    url = url.replace('bridge-app/', '');
 
    try {
      const response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(params?.data),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      console.log(response, 'kkkk-----');
      if (response?.ok == true) {
        const data = await response.json();
        navigate('OtpScreen', { phone: params?.data?.phone, otp: data?.otp });
        Toast.show(data?.message);
        return data;
      } else {
        const data = await response.json();

        Toast.show(data?.message ? data?.message : data?.errorMessage);
      }
    } catch (err) {
      // resetRoot('BottomFotter')

      return rejectWithValue('Opps there seems to be an error');
    }
  },
);





export const otpVerify = createAsyncThunk(
  'loginSlice/otpVerify',
  async (params, { rejectWithValue }) => {
    let url = base_url + Config.USER_SERVICE.OTP_VERIFY;
    url = url.replace('bridge-app/', '');
    try {
      const response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(params?.data),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      console.log(response, '----OTP---');
      if (response.ok == true) {
        const data = await response.json();
        console.log(data, data?.data?.associate_data, 'rrrrr');
        if (data?.data?.associate_data?.consentStatus === false) {
          navigate('TermsAndConditions', { userType: 'Associate' });
          return data;
        } else {
          resetRoot('ProfileFooter');
          Toast.show('login successful');
          return data;
        }
      } else if (response.ok == false) {
        Toast.show('invalid credentaial');
      } else {
        const data = await response.json();
        // console.log(data, 'otpp crasheddd');
        Toast.show(data ? data.errorMessage : 'invalid credentaial');
      }
    } catch (err) {
      console.log(err, 'errerr');
      return rejectWithValue('Opps there seems to be an error');
    }
  },
);

export const dealerProfile = createAsyncThunk(
  'loginSlice/dealerProfile',
  async (params, { rejectWithValue }) => {
    console.log(params, 'paramsparamsparams');
    let url = base_url + Config.USER_SERVICE.DEALER_PROFILE;
    url = url.replace('bridge-app/', '');
    url = url.replace('dealerCode', params.dealerCode);
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${params.token}`,
        },
      });

      if (response?.status == 200) {
        const data = await response.json();

        return data;
      } else if (response?.status == 401) {
        resetRoot('Login');
        // clearPayoutData();
        // clearLeadData();
        // clearDisbursalData();
        clearLoginData();
      } else {
        const data = await response.json();

        return null;
      }
    } catch (err) {
      console.log(err, 'errerr');
      return rejectWithValue('Opps there seems to be an error');
    }
  },
);


export const sendDealerOtp = createAsyncThunk(
  'loginSlice/sendDealerOtp',

  async (params, { rejectWithValue }) => {
    let url = base_url + Config.USER_SERVICE.SEND_LEAD_FORM_OTP;
    console.log(params, 'hhhh');
    try {
      const response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(params.data),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${params.token}`,
        },
      });
      console.log(response, 'jjjjj');
      if (response.status == 200) {
        const data = await response.json();

        return data;
      } else {
        const data = await response.json();
        console.log(data, 'datadata');
        Toast.show(data?.message ? data?.message : data?.errorMessage);
        return null;
      }
    } catch (err) {
      console.log(err, 'errerr');
      return rejectWithValue('Opps there seems to be an error');
    }
  },
);
export const verifyDealerOtp = createAsyncThunk(
  'loginSlice/verifyDealerOtp',

  async (params, { rejectWithValue }) => {
    let url = base_url + Config.USER_SERVICE.VERIFY_LEAD_FORM_OTP;

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(params.data),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${params.token}`,
        },
      });
      const data = await response.json();
      console.log(data, 'datadatadata');
      if (data?.isOtpVerified == true) {
        return data;
      } else {
        Toast.show('Invalid Otp');
        return data;
      }
    } catch (err) {
      console.log(err, 'errerr');
      return rejectWithValue('Opps there seems to be an error');
    }
  },
);




export const raiseQuary = createAsyncThunk(
  'loginSlice/raiseQuary',

  async (params, { rejectWithValue }) => {
    let url = base_url + Config.USER_SERVICE.RAISE_QUARY;

    console.log(url, '123456789098765432');
    try {
      const response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(params.data),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${params.token}`,
        },
      });
      const data = await response.json();

      if (response?.status == 200) {
        return data;
      } else {
        return data;
        // Toast.show(data?.errorMessage);
      }
    } catch (err) {
      console.log(err, 'err5555555555555555555555555err');
      return rejectWithValue('Opps there seems to be an error');
    }
  },
);

export const raiseQuaryL2 = createAsyncThunk(
  'loginSlice/raiseQuaryL2',

  async (params, { rejectWithValue }) => {
    let url = base_url + Config.USER_SERVICE.RAISE_QUARY;

    try {
      const response = await fetch(url, {
        method: 'PATCH',
        body: JSON.stringify(params.data),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${params.token}`,
        },
      });
      const data = await response.json();
      console.log(response, data, '------11111111--------22222222--');
      if (response?.status == 200) {
        // navigate('BottomFotter', {screen: 'Menu'});
        return data;
      }
    } catch (err) {
      console.log(err, 'errerr');
      return rejectWithValue('Opps there seems to be an error');
    }
  },
);

export const notificationAPI = createAsyncThunk(
  'loginSlice/notificationAPI',
  async (params, { rejectWithValue }, thunkAPI) => {
    let url = base_url + Config.USER_SERVICE.NOTIFICATION;
    url = url.replace('productcode', params?.data?.productCode);
    url = url.replace('dealercode', params?.data?.dealerCode);
    console.log(url, '-----wertyuiklo;');
    try {
      const response = await fetch(url, {
        method: 'GET',

        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${params.token}`,
        },
      });

      if (response.status == 200) {
        const data = await response.json();

        console.log(data, 'datadata--------quaryListquaryList');

        return data;
      } else {
        const data = await response.json();
      }
    } catch (err) {
      // resetRoot('BottomFotter')
    }
  },
);

export const termsandcondition = createAsyncThunk(
  'loginSlice/termsandcondition',

  async (params, { getState, rejectWithValue }) => {
    let url = base_url + Config.USER_SERVICE.TERMANDCONDTION;

    console.log(url, params, 'urlurlurl');
    try {
      const response = await fetch(url, {
        method: 'PUT',
        body: JSON.stringify(params.data),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${params?.token}`,
        },
      });

      const data = await response.json();

      if (response?.status == 200) {
        if (
          params &&
          params.userData &&
          params.userData.products &&
          params.userData.products[0]?.name == 'CA'
        ) {
          resetRoot('CollectionHome');
        } else if (params?.userType === 'Associate') {
          resetRoot('ProfileFooter');
        } else if (params?.userType === 'Dealer') {
          resetRoot('BottomFotter');
        }
        return data;
      }
    } catch (err) {
      console.log(err, 'errerr');
      return rejectWithValue('Opps there seems to be an error');
    }
  },
);

export const updatePersonalDetails = createAsyncThunk(
  'loginSlice/updatePersonalDetails',
  async (params, { getState, rejectWithValue }) => {
    let url = base_url + Config.USER_SERVICE.UPDATE_PERSONAL_DETAILS;
    url = url.replace('dealerCode', params?.dealerCode);

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(params.data),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${params?.token}`,
        },
      });

      const data = await response.json();

      if (response?.status == 200) {
        navigate('ProfileHome');
        return data;
      }
    } catch (err) {
      console.log(err, 'errerr');
      return rejectWithValue('Opps there seems to be an error');
    }
  },
);

export const addAllAssociates = createAsyncThunk(
  'loginSlice/addAllAssociates',
  async (params, { getState, rejectWithValue }) => {
    let url = base_url + Config.USER_SERVICE.ADD_ASSOCIATE;
    // url = url.replace('dealerCode', params?.dealerCode);

    try {
      const responseData = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(params.data),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${params?.token}`,
        },
      });

      if (!responseData.ok) {
        const errorText = await responseData.json();
        Toast.show('Number Already Exist');
        return;
      }
      const data = await responseData.json();

      if (responseData.ok) {
        navigate(
          'BottomFotter',
          { screen: 'VisitScreen' },
          { newAssociate: responseData },
        );
      }
    } catch (err) {
      console.log(err, 'errerr');
      return rejectWithValue('Opps there seems to be an error');
    }
  },
);

export const editAssociate = createAsyncThunk(
  'loginSlice/editAssociate',

  async (params, { rejectWithValue }) => {
    let url = base_url + Config.USER_SERVICE.EDIT_ASSOCIATE;
    url = url.replace('staffId', params?.staffId);

    try {
      const response = await fetch(url, {
        method: 'PUT',
        body: JSON.stringify(params.data),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${params.token}`,
        },
      });
      console.log(response, 'datadataline 1045');
      // const response = await response.json();
      const data = await response.json();

      if (response.ok) {
        Toast.show('Update successful');
        navigate('BottomFotter', { screen: 'VisitScreen' });
        onAssociateUpdate(response);
        return data;
      } else {
      }
    } catch (error) {
      console.log(err, 'errerr');
      return rejectWithValue('Opps there seems to be an error');
    }
  },
);

export const deleteAssociate = createAsyncThunk(
  'loginSlice/deleteAssociate',

  async (params, { rejectWithValue }) => {
    let url = base_url + Config.USER_SERVICE.DELETE_ASSOCIATE;
    url = url.replace('staffId', params?.staffId);

    try {
      const response = await fetch(url, {
        method: 'DELETE',
        body: JSON.stringify(params.data),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${params.token}`,
        },
      });
      return response;
    } catch (error) {
      console.log(err, 'errerr');
      return rejectWithValue('Opps there seems to be an error');
    }
  },
);

export const getPersonaldeatils = createAsyncThunk(
  'loginSlice/getPersonaldeatils',
  async (params, { rejectWithValue }) => {
    let url = base_url + Config.USER_SERVICE.GET_PERSONAL_DEATAILS;
    url = url.replace('dealerCode', params?.dealerCode);

    try {
      const response = await fetch(url, {
        method: 'GET',
        // body: JSON.stringify(params.data),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${params?.token}`,
        },
      });

      const data = await response.json();

      return data;
    } catch (err) {
      console.log('GET_ASSOCIATE', err);
      return rejectWithValue('Opps there seems to be an error');
    }
  },
);


export const verifyContractorAddress = createAsyncThunk(
  'loginSlice/verifyContractorAddress',
 async (addressFields, { rejectWithValue }) => {
    const { street, city, state, zipcode } = addressFields;

   // Build full address string
   const fullAddress = [street, city, state, zipcode]
     .map(s => s?.trim())
     .filter(Boolean)
     .join(', ');

   if (!fullAddress) {
     return rejectWithValue('Address fields are required.');
   }

   try {
     // ✅ Call Google Geocoding API directly
     const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=AIzaSyAwJzzG3VbyVTA0vEmKVQy7Ga15UYFJqGo`
      );

     const data = await response.json();

      console.log('📡 Google Geocode status:', data.status);

      if (data.status === 'OK' && data.results?.length > 0) {
       const { lat, lng } = data.results[0].geometry.location;
       const formattedAddress = data.results[0].formatted_address;

       console.log('✅ Address verified:', formattedAddress, { lat, lng });
       return {
          lat,
         lng,
        fullAddress: formattedAddress,
       };
      }

      // Map Google's status codes to user-friendly messages
     const statusMessages = {
       ZERO_RESULTS:     'Address not found. Please check your details and try again.',
       OVER_DAILY_LIMIT: 'Geocoding limit reached. Please try again later.',
       OVER_QUERY_LIMIT: 'Too many requests. Please try again later.',
       REQUEST_DENIED:   'Geocoding access denied. Check your API key restrictions.',
       INVALID_REQUEST:  'Invalid address. Please fill in all fields.',
       UNKNOWN_ERROR:    'Unknown error. Please try again.',
      };

      const msg = statusMessages[data.status] || 'Address could not be verified. Please check and try again.';
      console.warn('⚠️ Geocoding failed with status:', data.status);
      Toast.show(msg);
     return rejectWithValue(msg);

   } catch (err) {
      console.error('❌ Geocoding error:', err);
     const msg = 'Network error. Check your connection and try again.';
      Toast.show(msg);
     return rejectWithValue(msg);
   }
  }
);

export const fetchCountries = createAsyncThunk(
  'loginSlice/fetchCountries',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(
        'https://restcountries.com/v3.1/all?fields=name,flags,idd'
      );
 
      if (!response.ok) {
        return rejectWithValue('Failed to fetch countries');
      }
 
      const data = await response.json();
 
      const countries = data
        .map(c => ({
          name: c.name.common,
          flag: c.flags?.emoji ?? '',
          dial: c.idd?.root
            ? c.idd.root + (c.idd.suffixes?.length === 1 ? c.idd.suffixes[0] : '')
            : '',
        }))
        .filter(c => c.dial && c.name)
        .sort((a, b) => {
          if (a.name === 'United States') return -1;
          if (b.name === 'United States') return 1;
          return a.name.localeCompare(b.name);
        });
 
      return countries;
    } catch (err) {
      console.warn('fetchCountries error:', err);
      return rejectWithValue(err.message || 'Network error');
    }
  }
);


