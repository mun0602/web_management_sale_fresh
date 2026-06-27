import urllib.request
import json

api_key = "DdCbtjbnwkPrXovpVzIuOQoqrziDapCpShQmWVeBTWDcnofZqSbRhaSVwNQrxRdm"
headers = {"x-api-key": api_key}
base_url = "http://103.82.193.14:3000/api"

def get_request(endpoint):
    url = f"{base_url}/{endpoint}"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as res:
            return json.loads(res.read().decode())
    except Exception as e:
        print(f"Error {endpoint}: {e}")
        return None

def main():
    print("--- Listing all Dokploy Projects ---")
    projects = get_request("project.all")
    if not projects:
        print("No projects found.")
        return
        
    for proj in projects:
        print(f"\nProject: {proj.get('name')} (ID: {proj.get('projectId')})")
        # Mỗi project có các environments
        envs = proj.get("environments", [])
        for env in envs:
            env_id = env.get("environmentId")
            print(f"  Environment: {env.get('name')} (ID: {env_id})")
            
            # Lấy danh sách ứng dụng trong environment này
            # Dokploy trpc endpoint để lấy các app
            url = f"application.all?environmentId={env_id}"
            apps = get_request(url)
            if apps:
                for app in apps:
                    print(f"    - App: {app.get('name')} (ID: {app.get('applicationId')})")
                    print(f"      Source: {app.get('sourceType')} | Branch: {app.get('customGitBranch') or app.get('branch')}")
                    print(f"      Auto Deploy: {app.get('autoDeploy')} | Token: {app.get('refreshToken')}")
            else:
                print("    No applications found.")

if __name__ == "__main__":
    main()
