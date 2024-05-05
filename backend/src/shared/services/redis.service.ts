import redis from 'redis';
import { Server } from 'socket.io';

const client = redis.createClient();
