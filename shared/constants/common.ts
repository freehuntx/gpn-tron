export const tickrate = 3 // How many ticks per second?
export const afkTimeout = 0 // After what amount of ms not sending data a user is count as afk?
export const joinTimeout = 5000 // After what amount of ms not sending the join packet should a user time out?
export const maxPacketsPerSecond = tickrate + 3 // How many packets per second are allowed?
export const maxConnections = 1 // How many connections per ip are allowed?