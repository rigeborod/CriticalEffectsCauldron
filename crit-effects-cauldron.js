const EFFECT_NAMES = ["Crit Fail", "Crit Success"];
const ALLOW_LINKED_TOKENS = true;
const MODULE_ID = "crit-effects-cauldron";
export const CritEffectsCauldron = {
  savedTargetLevelOrCR: null,

  saveTargetLevelOrCR(targetToken) {
    this.savedTargetLevelOrCR =
      targetToken.actor?.system?.details?.cr ??
      targetToken.actor?.system?.details?.level ??
      0;
    this.savedTargetLevelOrCR = Math.floor(this.savedTargetLevelOrCR);
  },

  getTargetLevelOrCR() {
    return this.savedTargetLevelOrCR;
  },

  clearTargetLevelOrCR() {
    this.savedTargetLevelOrCR = null;
  }
};




async function loadEffectFile(path) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Failed to load ${path}`);
  }

  const data = await response.json();

  if (!Array.isArray(data.effects)) {
    throw new Error(`File ${path} does not contain an effects array`);
  }

  return data;
}
async function addEffectToDfreds(effectData) {
  if (!game.dfreds?.effectInterface) {
    throw new Error("DFreds Convenient Effects is not available.");
  }

  const effect = foundry.utils.deepClone(effectData);

  await game.dfreds.effectInterface.createNewCustomEffectsWith({
    activeEffects: [effect]
  });
}
function findConvenientFolder(folderData) {
  return game.items.find(item =>
    item.getFlag("dfreds-convenient-effects", "isConvenient") === true &&
    item.type === folderData.type &&
    item.name === folderData.name
  );
}
function findConvenientEffect(effectData, folderItem) {
  return folderItem.effects.find(effect =>
    effect.name === effectData.name
  );
}
async function replaceFolderEffects(folderData) {
  let folderItem = findConvenientFolder(folderData);
  if (!!folderItem) {
    const existingIds = folderItem.effects
      .filter(effect => effect.getFlag("dfreds-convenient-effects", "ceEffectId"))
      .map(effect => effect.id);

    if (existingIds.length > 0) {
      await folderItem.deleteEmbeddedDocuments("ActiveEffect", existingIds);
    }
  }

  const ceApi = game.modules.get("dfreds-convenient-effects")?.api;

  await ceApi.createNewEffects({
    existingFolderId: folderItem?.id,
    newFolderData: {
      name: folderData.name,
      type: "facility",
      color: folderData.flags?.["dfreds-convenient-effects"]?.folderColor ?? ""
    },
    effectsData: folderData.effects
  });
}
async function getOrCreateMacroFolder(folderName) {
  let folder = game.folders.find(f =>
    f.type === "Macro" &&
    f.name === folderName
  );

  if (folder) return folder;

  folder = await Folder.create({
    name: folderName,
    type: "Macro",
    color: "#3a3a3a"
  });

  return folder;
}
async function importMissingMacros(packId) {
  const pack = game.packs.get(packId);
  if (!pack) throw new Error(`Pack not found: ${packId}`);

  const docs = await pack.getDocuments();
  const folder = await getOrCreateMacroFolder("Critical Effects Cauldron");

  for (const macroDoc of docs) {
    const macro = game.macros.find(m => m.name === macroDoc.name);
    if (!!macro) await macro.delete();

    const data = macroDoc.toObject();
    await Macro.create({
      ...data,
      folder: folder.id
    });
  }

  console.log(`Imported missing macros from ${packId}.`);
}
async function getOrCreateActorFolder(folderName) {
  let folder = game.folders.find(f =>
    f.type === "Actor" &&
    f.name === folderName
  );

  if (folder) return folder;

  folder = await Folder.create({
    name: folderName,
    type: "Actor",
    color: "#3a3a3a"
  });

  return folder;
}
async function importMissingActors(packId) {
  const pack = game.packs.get(packId);
  if (!pack) throw new Error(`Pack not found: ${packId}`);

  const folder = await getOrCreateActorFolder("Crit Effects Cauldron");
  const docs = await pack.getDocuments();

  for (const actorDoc of docs) {
    const actor = game.actors.find(a => a.name === actorDoc.name);
    if (!!actor) await actor.delete();

    const data = actorDoc.toObject();
    await Actor.create({
      ...data,
      folder: folder.id
    });
  }

  console.log(`Imported missing actors from ${packId}.`);
}
function findWorldEffectByName(effectName) {
  for (const item of game.items) {
    const effect = item.effects.find(e => e.name === effectName);
    if (effect) return effect;
  }
  return null;
}
function isEligibleToken(token) {
  const actor = token?.actor;
  if (!actor) return false;
  return actor.type === "character" || actor.type === "npc";
}
function isSafeToApply(token) {
  if (!isEligibleToken(token)) return false;

  // For linked tokens, actor effects are shared.
  if (token.document.actorLink && !ALLOW_LINKED_TOKENS) return false;

  return true;
}
async function ensureEffectOnToken(token, sourceEffect, effectName) {
  if (!isSafeToApply(token)) return;

  const actor = token.actor;
  if (actor.effects.some(e => e.name === effectName)) return;

  const effectData = sourceEffect.toObject();
  effectData.disabled = true;

  await actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
  console.log(`Added "${effectName}" to ${token.name}`);
}
async function ensureEffectOnScene(scene, effectName) {
  if (!scene) return;

  const sourceEffect = findWorldEffectByName(effectName);
  if (!sourceEffect) {
    ui.notifications.warn(`World effect "${effectName}" not found.`);
    return;
  }

  for (const tokenDoc of scene.tokens) {
    const token = tokenDoc.object ?? canvas.tokens.get(tokenDoc.id);
    console.log(token);
    if (!token) continue;
    await ensureEffectOnToken(token, sourceEffect, effectName);
  }
}
function buildDynamicDescription(effect) {
  const original = effect.description ?? "";
  const targetLevelOrCR = CritEffectsCauldron.getTargetLevelOrCR() ?? "undefined";  

  if (targetLevelOrCR === "undefined") return original;

  const lowTemplate = "[Слабый]";
  let low = lowTemplate;
  const averageTemplate = "[Средний]";
  let average = averageTemplate;
  const highTemplate = "[Сильный]";
  let high = highTemplate;
  
  if (targetLevelOrCR <= 2) {
    low = "<b>1</b>";
    average = "<b>2</b>";
    high = "<b>3</b>";
  } else if (targetLevelOrCR <= 4) {
    low = "<b>1d4</b>";
    average = "<b>1d4 + 1</b>";
    high = "<b>2d4</b>";
  } else if (targetLevelOrCR <= 7) {
    low = "<b>1d6</b>";
    average = "<b>2d4</b>";
    high = "<b>2d6</b>";
  } else if (targetLevelOrCR <= 10) {
    low = "<b>1d8</b>";
    average = "<b>2d6</b>";
    high = "<b>2d8</b>";
  } else if (targetLevelOrCR <= 15) {
    low = "<b>1d10</b>";
    average = "<b>2d6 + 2</b>";
    high = "<b>2d10</b>";
  } else if (targetLevelOrCR <= 20) {
    low = "<b>1d12</b>";
    average = "<b>2d8</b>";
    high = "<b>2d12</b>";
  }
  
  return original.replaceAll(lowTemplate, low).replaceAll(averageTemplate, average).replaceAll(highTemplate, high);
}










Hooks.once("init", () => {
  globalThis.CritEffectsCauldron = CritEffectsCauldron;
  console.log("Critical Effects Cauldron module loaded");
});

Hooks.once("ready", async () => {
  if (!game.user.isGM) return;
  const fileNames = [
    "crit-monitoring-effects.json",
    "crit-fail-magic.json",
    "crit-fail-melee.json",
    "crit-fail-range.json",
    "crit-success-magic.json",
    "crit-success-melee.json",
    "crit-success-range.json",
    "crit-selectors.json"
  ];
  for (let fileName of fileNames) {
    const fileData = await loadEffectFile("modules/crit-effects-cauldron/data/" + fileName);
    await replaceFolderEffects(fileData);
  }  
  ui.convenientEffects?.render(true);

  await importMissingMacros("crit-effects-cauldron.critical-effects-cauldron-macros");
  await importMissingActors("crit-effects-cauldron.critical-effects-cauldron-actors");

  for (let effectName of EFFECT_NAMES) {
    await ensureEffectOnScene(game.scenes.current, effectName);
  }
});

Hooks.on("canvasReady", async (canvas) => {
  if (!game.user.isGM) return;
  for (let effectName of EFFECT_NAMES) {
    await ensureEffectOnScene(game.scenes.current, effectName);
  }
});

Hooks.on("createToken", async (tokenDoc) => {
  if (!game.user.isGM) return;
  const scene = game.scenes.current;
  if (!scene || tokenDoc.parent?.id !== scene.id) return;

  for (let effectName of EFFECT_NAMES) {
    const sourceEffect = findWorldEffectByName(effectName);
    if (!sourceEffect) return;
  
    const token = tokenDoc.object ?? canvas.tokens.get(tokenDoc.id);
    if (!token) return;
  
    await ensureEffectOnToken(token, sourceEffect, effectName);
  }
});

Hooks.on("preCreateActiveEffect", (effect, data, options, userId) => {
  if (!effect.getFlag(MODULE_ID, "dynamicDescription")) return;

  const description = buildDynamicDescription(effect);

  effect.updateSource({ description });
});







if (canvas?.scene) {
  if (game.user.isGM) {
    for (let effectName of EFFECT_NAMES) {
      await ensureEffectOnScene(canvas.scene, effectName);
    }
  }
}