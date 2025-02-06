# WEB Modbus
https://adrianscheit.github.io/web-modbus/

Currently it is is only a "beta" version.

Currently it is without a license, so legally the default policy is applicable (where all author rights are reserved). 

## Goals: 
- simple "low-level" (regarding the Modbus protocol) Web Serial API Modbus toolset for most PC's (also MAC's), to easly debug a Modbus network, 
- that everyone could possible use it without a requirement to install a dedicated software (for browsers that supports Web Serial API)
- Does not matter if the phisical layer is:
    - RS485 (recomended)
    - RS422
    - RS232 (please do not)
    - TTL
    - or any other UART-type phisical network

## Notices:
- if the Modbus network does not work at all, this software will propably not help, first you should use a real osciloscope, where many problems, like missing terminators (120Ohm) are directly visible on the display (at edges of each bit), and where baud-rates can be also calculated (from distance between bits)
- obviously: all devices on a Modbus BUS, should be configured to the same Modbus mode, boud-rate and parity
- Modbus BUS will be empty if master is disconnected or malfunctioning

### Done
- opening serial port
- sniffing functionality
- handling errors in the incomming data
- handling fragmentation of the incoming frames
- registers decoding support for types:
    - Uint8
    - Int8
    - Uint16
    - Int16
    - Uint32
    - Int32
    - Float32
    - Float64

### TODO
- add license
- sending any frames, also with unknown function-codes and forbidden slave addresses
- assigning data types to a specific slave addresses and its registries addresses
- move the tests to a dedicated test framework like `jest`

### Local development
```sh
git config --global user.name "<First Last>"
git config --global user.email "<address@server.domain>"
ssh-keygen -t ed25519
cat ~/.ssh/id_ecdsa.pub # copy to GitHub
```
