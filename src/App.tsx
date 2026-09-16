/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { PlayerProfile, AircraftConfig, MissionDef } from './types';
import { loadPlayerProfile, savePlayerProfile } from './game/storage';
import { AIRCRAFT_LIST } from './game/aircraftData';
import { MISSIONS } from './game/missionsData';
import { LobbyHangar } from './game/LobbyHangar';
import { SkyShield3DGame } from './game/SkyShield3DGame';
import { soundManager } from './audio/soundManager';

export default function App() {
  const [profile, setProfile] = useState<PlayerProfile>(() => loadPlayerProfile());
  const [gameState, setGameState] = useState<'lobby' | 'game'>('lobby');
  const [selectedAircraft, setSelectedAircraft] = useState<AircraftConfig>(() => {
    const p = loadPlayerProfile();
    return AIRCRAFT_LIST.find(a => a.id === p.selectedAircraftId) || AIRCRAFT_LIST[0];
  });
  const [activeMission, setActiveMission] = useState<MissionDef>(() => MISSIONS[0]);

  // Persist profile changes
  const handleUpdateProfile = (newProfile: PlayerProfile) => {
    setProfile(newProfile);
    savePlayerProfile(newProfile);
  };

  // Launch into 3D Dogfight Mission
  const handleStartMission = (
    aircraft: AircraftConfig,
    mission: MissionDef,
    updatedProfile: PlayerProfile
  ) => {
    soundManager.init();
    setSelectedAircraft(aircraft);
    setActiveMission(mission);
    handleUpdateProfile(updatedProfile);
    setGameState('game');
  };

  // Exit from 3D Dogfight back to Hangar Lobby
  const handleExitToLobby = (updatedProfile: PlayerProfile) => {
    handleUpdateProfile(updatedProfile);
    setGameState('lobby');
  };

  return (
    <div className="w-full h-screen bg-[#050c18] overflow-hidden">
      {gameState === 'lobby' ? (
        <LobbyHangar
          profile={profile}
          onStartMission={handleStartMission}
          onUpdateProfile={handleUpdateProfile}
        />
      ) : (
        <SkyShield3DGame
          aircraft={selectedAircraft}
          profile={profile}
          mission={activeMission}
          onExitToLobby={handleExitToLobby}
          lang={profile.language}
        />
      )}
    </div>
  );
}

