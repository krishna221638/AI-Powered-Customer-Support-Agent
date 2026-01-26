import httpx
from typing import Dict, Any, Optional, Tuple

async def post_to_external_platform(
    url: str,
    payload: Dict[str, Any],
    headers: Optional[Dict[str, str]] = None
) -> Tuple[Optional[Dict[str, Any]], int]:
    """
    Sends an asynchronous POST request to an external platform.

    Args:
        url: The endpoint URL of the external platform.
        payload: The data to be sent in the POST request (will be JSON serialized).
        headers: Optional dictionary of HTTP headers (e.g., for authentication).

    Returns:
        A tuple containing:
            - The JSON response from the platform as a dictionary, or None if an error occurs
              or the response is not valid JSON.
            - The HTTP status code of the response. 
              Returns 0 if the request failed before receiving a status code.
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers)
            
            # Raise an exception for 4XX/5XX responses
            response.raise_for_status() 
            
            try:
                response_json = response.json()
            except ValueError: # Includes JSONDecodeError
                print(f"Failed to decode JSON response from {url}. Status: {response.status_code}")
                response_json = None
            
            return response_json, response.status_code

    except httpx.HTTPStatusError as e:
        print(f"HTTP error occurred while posting to {url}: {e.response.status_code} - {e.response.text}")
        # Attempt to return JSON error details if available
        error_json = None
        try:
            error_json = e.response.json()
        except ValueError:
            pass # No valid JSON in error response
        return error_json, e.response.status_code
    except httpx.RequestError as e:
        print(f"Request error occurred while posting to {url}: {str(e)}")
        return None, 0 # 0 status code indicates a request error before HTTP response
    except Exception as e:
        print(f"An unexpected error occurred while posting to {url}: {str(e)}")
        return None, 0

# Example Usage (you would call this from another part of your agent code):
# async def example_usage():
#     servicenow_url = "https://your-instance.service-now.com/api/now/table/incident"
#     
#     # ServiceNow often uses Basic Auth, which can be set in headers
#     # IMPORTANT: Do not hardcode credentials. Use environment variables or a config service.
#     # import base64
#     # username = "your_servicenow_user"
#     # password = "your_servicenow_password"
#     # auth_string = f"{username}:{password}"
#     # auth_header = {
#     #     "Authorization": f"Basic {base64.b64encode(auth_string.encode()).decode()}",
#     #     "Content-Type": "application/json",
#     #     "Accept": "application/json"
#     # }
# 
#     # Example: API Key authentication
#     api_key_headers = {
#         "Authorization": "Bearer YOUR_API_KEY", # Or "X-API-Key": "YOUR_API_KEY", etc.
#         "Content-Type": "application/json",
#         "Accept": "application/json"
#     }
# 
#     incident_payload = {
#         "short_description": "Automated ticket: Network outage reported",
#         "caller_id": "AI Agent", # Or a specific user sys_id
#         "urgency": "2", # 1-High, 2-Medium, 3-Low
#         "impact": "2",
#         "comments": "This incident was automatically created by the AI Triage Agent based on a customer report."
#     }
# 
#     response_data, status_code = await post_to_external_platform(
#         url=servicenow_url,
#         payload=incident_payload,
#         headers=api_key_headers # or auth_header for basic auth
#     )
# 
#     if status_code == 201 and response_data: # 201 Created is typical for ServiceNow incident creation
#         print("Successfully created incident in ServiceNow.")
#         print(f"Response: {response_data}")
#     elif response_data:
#         print(f"Failed to create incident. Status: {status_code}, Response: {response_data}")
#     else:
#         print(f"Failed to create incident. Status: {status_code}")

# To run the example (e.g., in a test script or an async context):
# import asyncio
# asyncio.run(example_usage()) 