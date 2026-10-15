export function localizeCase(item, t) {
  const localized = { ...item };

  for (const field of ['name', 'category', 'description', 'face', 'pos', 'note']) {
    if (typeof item[field] === 'string') {
      localized[field] = t(`data.case.${item.id}.${field}`);
    }
  }

  return localized;
}

export function localizeCases(items, t) {
  return items.map(item => localizeCase(item, t));
}

export function localizeGroups(namespace, groups, t) {
  return groups.map(group => ({
    ...group,
    group: t(`data.group.${namespace}.${group.section}.title`),
    description: group.description
      ? t(`data.group.${namespace}.${group.section}.description`)
      : group.description,
    cases: localizeCases(group.cases, t)
  }));
}

export function localizeCFOPGroups(sectionId, groups, t) {
  return groups.map((group, index) => ({
    ...group,
    group: t(`data.group.cfop.${sectionId}.${index}`),
    cases: localizeCases(group.cases, t)
  }));
}

export function localizeSteps(steps, t) {
  return steps.map(step => ({
    ...step,
    title: t(`data.step.${step.id}.title`),
    subtitle: t(`data.step.${step.id}.subtitle`),
    explanation: step.explanation?.map((_, index) =>
      t(`data.step.${step.id}.explanation.${index}`)
    ),
    content: step.content?.map((_, index) =>
      t(`data.step.${step.id}.content.${index}`)
    ),
    cases: localizeCases(step.cases || [], t)
  }));
}
