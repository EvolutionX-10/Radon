import { RadonClient } from '#lib/RadonClient';
import '#lib/setup';
const client = new RadonClient();
(async () => {
	await client.login();
})();
