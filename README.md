# Critical Effects Cauldron

A Foundry VTT module for managing and importing custom critical effects.

This module is built to work with DFreds Convenient Effects and related automation modules. It imports and updates custom crit effects, required macros, and supporting actors so they can be reused across worlds and shared easily.

## Features

- Imports custom critical effects from module data into DFreds Convenient Effects
- Imports required macros into a dedicated world macro folder
- Imports required actors into a dedicated world actor folder
- Designed for portability between worlds and installations

## Required Modules

This module requires the following modules to be installed and active:

- DFreds Convenient Effects
- DFreds Effects Panel
- ATL
- Active Auras
- DAE
- Times Up
- Vision 5e

## Installation

In Foundry VTT:

1. Go to **Setup**
2. Open **Add-on Modules**
3. Click **Install Module**
4. Paste this manifest URL:

https://github.com/rigeborod/CriticalEffectsCauldron/releases/latest/download/module.json

## First-Time Setup

To enable the module in a world:

1. Make sure all required dependency modules are enabled
2. Enable **Critical Effects Cauldron**
3. Let the module finish its startup import process

The module will automatically:

- import/update its macros
- import/update its actors
- import/update its custom crit effects in DFreds Convenient Effects

## Notes

- Existing module-managed crit effects are replaced on load so updates are applied cleanly
- crit effects are imported in several dedicated folders to avoid clutter
- Macros are imported into a dedicated folder to avoid clutter
- Actors are imported into a dedicated folder to avoid clutter
- This module is intended to be the source of truth for its managed effects

## Credits

Programmed by rigeborod.
Critical effects created by nick_rimer and rigeborod.

Built for use with Foundry VTT and DFreds Convenient Effects.
