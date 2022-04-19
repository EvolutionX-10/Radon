import { RadonClient } from '#lib/RadonClient';
import '#lib/setup';

const client = new RadonClient();
await client.login();
