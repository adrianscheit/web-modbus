# Modbus
https://adrianscheit.github.io/modbus/
## Goals: 
- simple low-lever serial Modbus toolset for most PC's (also MAC's), to easly debug a modbus network, 
- that everyone could possible use it without a need to install some dedicated software

Currently it is is only a "beta" version.
Currently it is without a license.

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
- sending all standard types of frames
- assigning data types to a specific slave addresses and its registries addresses
- slave mocks
- move the tests to a dedicated test framework like `jest`
- simple master??? maybe out of scope for this project

