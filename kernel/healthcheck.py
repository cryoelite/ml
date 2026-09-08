"""Is the kernel listening?

Liveness, not authorisation. An unauthenticated /api/status returns 403, and a
403 still proves Jupyter is up and answering — which is the only thing a
healthcheck should assert. Treating that 403 as a failure marks a perfectly
healthy kernel unhealthy, which is what the first version of this did.

Exit 0 if anything answered at all; exit 1 only if nothing did.
"""

import sys
import urllib.error
import urllib.request

URL = "http://localhost:8899/api/status"

try:
    urllib.request.urlopen(URL, timeout=4)
except urllib.error.HTTPError:
    sys.exit(0)  # it answered — 403 without a token is expected and fine
except OSError:
    # URLError subclasses OSError, so this covers refused connections,
    # DNS failures and timeouts alike.
    sys.exit(1)
sys.exit(0)
