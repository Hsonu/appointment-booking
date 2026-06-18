(function () {
    // 1. Detect if the current page is a login page
    const pathname = window.location.pathname.toLowerCase();
    const isLoginPage = 
        pathname.endsWith("/owner") ||
        pathname.endsWith("/owner/") ||
        pathname.includes("owner-login.html") ||
        pathname.endsWith("/admin") ||
        pathname.endsWith("/admin/") ||
        pathname.includes("adminpanel/order/login.html") ||
        (pathname.endsWith("/login.html") && !pathname.includes("adminpanel"));

    const isOwnerContext = pathname.includes("owner");
    const isAdminContext = !isOwnerContext && (pathname.includes("admin") || pathname.includes("dashboard.html"));
    const isUserContext = !isOwnerContext && !isAdminContext;

    // 2. Logout functions
    function logoutOwner() {
        console.log("Logging out Owner...");
        localStorage.removeItem("ownerId");
        localStorage.removeItem("ownerLoggedIn");
        localStorage.removeItem("ownerSessionToken");
        window.location.href = "/owner";
    }

    function logoutAdmin() {
        console.log("Logging out Admin...");
        localStorage.removeItem("adminId");
        localStorage.removeItem("adminLoggedIn");
        localStorage.removeItem("adminSessionToken");
        window.location.href = "/admin";
    }

    function logoutUser() {
        console.log("Logging out User...");
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("userNumber");
        localStorage.removeItem("userSessionToken");
        window.location.href = "/login.html";
    }

    // 3. Inactivity auto-logout (5 minutes)
    const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes in ms
    let inactivityTimer;

    function resetInactivityTimer() {
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(triggerInactivityLogout, INACTIVITY_TIMEOUT);
    }

    function triggerInactivityLogout() {
        // Only log out if there is an active session
        const hasOwnerSession = localStorage.getItem("ownerLoggedIn") === "true";
        const hasAdminSession = localStorage.getItem("adminLoggedIn") === "true";
        const hasUserSession = localStorage.getItem("isLoggedIn") === "true";

        if (isOwnerContext && hasOwnerSession) {
            console.log("Inactivity timeout: Logging out Owner.");
            logoutOwner();
        } else if (isAdminContext && hasAdminSession) {
            console.log("Inactivity timeout: Logging out Admin.");
            logoutAdmin();
        } else if (isUserContext && hasUserSession) {
            console.log("Inactivity timeout: Logging out User.");
            logoutUser();
        }
    }

    // Initialize inactivity tracking if not on a login page
    if (!isLoginPage) {
        resetInactivityTimer();
        const activityEvents = ["mousemove", "keydown", "keypress", "click", "scroll"];
        activityEvents.forEach(event => {
            window.addEventListener(event, resetInactivityTimer, { passive: true });
        });
    }

    // 4. Global Fetch Interceptor
    const originalFetch = window.fetch;
    window.fetch = async function (resource, options = {}) {
        options.headers = options.headers || {};
        
        // Convert headers to a standard plain object for manipulation
        let headersObj = {};
        if (options.headers instanceof Headers) {
            for (let [key, value] of options.headers.entries()) {
                headersObj[key.toLowerCase()] = value;
            }
        } else if (Array.isArray(options.headers)) {
            options.headers.forEach(([key, value]) => {
                headersObj[key.toLowerCase()] = value;
            });
        } else {
            Object.keys(options.headers).forEach(key => {
                headersObj[key.toLowerCase()] = options.headers[key];
            });
        }

        // Retrieve tokens and IDs
        const ownerToken = localStorage.getItem("ownerSessionToken");
        const ownerId = localStorage.getItem("ownerId");
        const adminToken = localStorage.getItem("adminSessionToken");
        const adminId = localStorage.getItem("adminId");
        const userToken = localStorage.getItem("userSessionToken");
        const userNumber = localStorage.getItem("userNumber");

        // Inject headers depending on the page context
        if (isOwnerContext) {
            if (ownerToken && !headersObj["x-session-token"]) {
                headersObj["x-session-token"] = ownerToken;
            }
            if (ownerId && !headersObj["x-owner-id"]) {
                headersObj["x-owner-id"] = ownerId;
            }
            if (ownerId && !headersObj["x-admin-id"]) {
                headersObj["x-admin-id"] = ownerId;
            }
        } else if (isAdminContext) {
            if (adminToken && !headersObj["x-session-token"]) {
                headersObj["x-session-token"] = adminToken;
            }
            if (adminId && !headersObj["x-admin-id"]) {
                headersObj["x-admin-id"] = adminId;
            }
        } else if (isUserContext) {
            if (localStorage.getItem("isLoggedIn") === "true") {
                if (userToken && !headersObj["x-session-token"]) {
                    headersObj["x-session-token"] = userToken;
                }
                if (userNumber && !headersObj["x-user-number"]) {
                    headersObj["x-user-number"] = userNumber;
                }
            }
        }

        options.headers = headersObj;

        // Determine if this is an authentication request
        let requestUrl = "";
        if (typeof resource === "string") {
            requestUrl = resource;
        } else if (resource && resource.url) {
            requestUrl = resource.url;
        }
        requestUrl = requestUrl.toLowerCase();

        const isAuthRequest = 
            requestUrl.includes("/login") || 
            requestUrl.includes("/newuser") || 
            requestUrl.includes("/send-otp");

        try {
            const response = await originalFetch(resource, options);

            // If a 401 Unauthorized occurs on a non-auth page/request, trigger logout
            if (response.status === 401 && !isAuthRequest && !isLoginPage) {
                console.warn("Session expired (401). Redirecting to login...");
                if (isOwnerContext) {
                    logoutOwner();
                } else if (isAdminContext) {
                    logoutAdmin();
                } else {
                    logoutUser();
                }
            }
            return response;
        } catch (error) {
            throw error;
        }
    };
})();
