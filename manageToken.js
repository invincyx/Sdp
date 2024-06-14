let token = null;
let tokenExpiration = null;

export async function getToken() {
  const currentTime = new Date();

  // If token is not null and it's not expired, return it
  if (token && currentTime < tokenExpiration) {
    return token;
  }

  const myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/x-www-form-urlencoded");
  myHeaders.append("Accept", "application/json");
  myHeaders.append("Authorization", "Basic U2hhbmtseTEzNTpTaGFua2x5QDEyMyE=");

  const urlencoded = new URLSearchParams();
  urlencoded.append("grant_type", "client_credentials");

  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: urlencoded,
    redirect: "follow"
  };

  try {
    const data  = await fetch("http://10.10.11.162:9480/token/", requestOptions);
    const response = await data.json();

    // Store the token and its expiration time
    token = response;
    tokenExpiration = new Date(currentTime.getTime() + response.expires_in * 1000);

    return response;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}
