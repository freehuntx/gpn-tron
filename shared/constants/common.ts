export const baseTickrate = 1 // How many ticks per second?
export const tickIncreaseInterval = 20 // How much time to wait until increasing the tickrate by 1
export const afkTimeout = 0 // After what amount of ms not sending data a user is count as afk?
export const joinTimeout = 5000 // After what amount of ms not sending the join packet should a user time out?
//export const maxPacketsPerSecond = baseTickrate + 3 // How many packets per second are allowed?
export const maxConnections = 1 // How many connections per ip are allowed?