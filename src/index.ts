import { RadonClient } from '#lib/RadonClient';
import '#lib/setup';
process.on('warning', console.warn);
const client = new RadonClient();
await client.login();
