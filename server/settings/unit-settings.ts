type UnitSettingRecord = {
  key: string
  value: string | null
}

type UnitSettingReaderClient = {
  unitSetting: {
    findMany(args: {
      where: {
        key: {
          in: string[]
        }
        unitId: string
      }
    }): Promise<UnitSettingRecord[]>
  }
}

export async function loadUnitSettings(
  client: UnitSettingReaderClient,
  unitId: string,
  keys: readonly string[],
) {
  const normalizedKeys = Array.from(keys)

  const settings = await client.unitSetting.findMany({
    where: {
      unitId,
      key: {
        in: normalizedKeys,
      },
    },
  })

  return new Map(settings.map((setting) => [setting.key, setting.value]))
}

export function readBooleanUnitSetting(
  settings: ReadonlyMap<string, string | null>,
  key: string,
  fallbackValue: boolean,
) {
  const value = settings.get(key)

  if (value === undefined || value === null || value === '') {
    return fallbackValue
  }

  return value === 'true'
}

export function readNumericUnitSetting(
  settings: ReadonlyMap<string, string | null>,
  key: string,
  fallbackValue: number,
) {
  const value = settings.get(key)

  if (!value) {
    return fallbackValue
  }

  const parsedValue = Number(value)

  return Number.isFinite(parsedValue) ? parsedValue : fallbackValue
}
