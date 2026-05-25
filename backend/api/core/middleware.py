from typing import Dict, List, Optional
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from enum import Enum
from .config import settings

class UserRole(str, Enum):
    ADMIN = "admin"
    LEADER = "project-leader"
    STAFF = "project-staff"
    SUPPER_LEADER= "supper-leader"

class RBACConfig:
    """Role-Based Access Control Configuration"""
    
    def __init__(self):
        # Define endpoints that staff cannot access
        self.staff_restricted_endpoints = {
            "DELETE": ["*"],  # Staff cannot use any DELETE endpoints
            "POST": [""],  # Example: staff cannot create domains
            "PUT": [""],  # Example: staff cannot update domains
        }
        
        # Admin and leader have full access by default
        self.admin_endpoints = {"*": ["*"]}  # All methods, all paths
        self.leader_endpoints = {"*": ["*"]}  # All methods, all paths
        
    def is_path_matched(self, pattern: str, path: str) -> bool:
        """Check if a path matches a pattern with wildcards"""
        if pattern == "*":
            return True
        
        # Convert pattern to regex-like matching
        if pattern.endswith("/*"):
            return path.startswith(pattern[:-1])
        return pattern == path
    
    def is_endpoint_restricted(self, method: str, path: str, role: str) -> bool:
        """
        Check if an endpoint is restricted for a given role
        Returns True if access should be denied
        """
        # Admin and leader have full access
        if role.lower() in [UserRole.ADMIN.value, UserRole.LEADER.value, UserRole.SUPPER_LEADER.value]:
            return False
            
        # For staff, check restrictions
        if role.lower() == UserRole.STAFF.value:
            # Check method-specific restrictions
            if method in self.staff_restricted_endpoints:
                restricted_paths = self.staff_restricted_endpoints[method]
                
                # Check each restricted path pattern
                for pattern in restricted_paths:
                    if self.is_path_matched(pattern, path):
                        return True
                        
        return False

class AuthMiddleware:
    def __init__(self):
        self.user_id_header = "x-user-id"
        self.user_role_header = "x-user-role"
        self.rbac_config = RBACConfig()
        
    async def get_user_info(self, request: Request) -> tuple[str, str]:
        """Get user ID and role from request headers or mock data"""
        if not settings.AUTH_ENABLED:
            # Development mode - use mock data
            return settings.MOCK_USER_ID, settings.MOCK_USER_ROLE
            
        # Production mode - get from headers
        user_id = request.headers.get(self.user_id_header)
        user_role = request.headers.get(self.user_role_header)
        
        if not user_id or not user_role:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing user information in headers"
            )
            
        return user_id, user_role.lower()
    
    def check_access(self, method: str, path: str, role: str) -> bool:
        """Check if user has access to the endpoint"""
        if not settings.AUTH_ENABLED:
            # In development mode, allow all access if auth is disabled
            return True
            
        return not self.rbac_config.is_endpoint_restricted(method, path, role)

async def auth_middleware(request: Request, call_next):
    """Global middleware to handle authentication and authorization"""
    try:
        # Skip auth for specific endpoints even in production
        if request.url.path in ["/docs", "/redoc", "/openapi.json"]:
            return await call_next(request)
            
        auth = AuthMiddleware()
        user_id, user_role = await auth.get_user_info(request)
        
        # Add user info to request state
        request.state.user_id = user_id
        request.state.user_role = user_role
        
        # Check endpoint access
        if not auth.check_access(request.method, request.url.path, user_role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied for role {user_role} to {request.method} {request.url.path}"
            )
        
        response = await call_next(request)
        return response
        
    except HTTPException as exc:
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail}
        )
    except Exception as exc:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Internal server error"}
        )
