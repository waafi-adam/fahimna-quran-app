import { View, Text } from 'react-native';
import type { WordMorphology } from '@/types/quran';
import type { Colors } from '@/lib/theme';

type Props = {
  morphology: WordMorphology;
  colors: Colors;
};

const GENDER_LABELS: Record<string, [string, string]> = {
  m: ['مذكر', 'Masculine'], f: ['مؤنث', 'Feminine'],
};
const NUMBER_LABELS: Record<string, [string, string]> = {
  s: ['مفرد', 'Singular'], d: ['مثنى', 'Dual'], p: ['جمع', 'Plural'],
};
const PERSON_LABELS: Record<string, [string, string]> = {
  '1': ['متكلم', '1st person'], '2': ['مخاطب', '2nd person'], '3': ['غائب', '3rd person'],
};
const CASE_LABELS: Record<string, [string, string]> = {
  nom: ['مرفوع', 'Nominative'], acc: ['منصوب', 'Accusative'], gen: ['مجرور', 'Genitive'],
};
const MOOD_LABELS: Record<string, [string, string]> = {
  ind: ['مرفوع', 'Indicative'], sub: ['منصوب', 'Subjunctive'], jus: ['مجزوم', 'Jussive'],
};
const VOICE_LABELS: Record<string, [string, string]> = {
  act: ['معلوم', 'Active'], pass: ['مجهول', 'Passive'],
};
const STATE_LABELS: Record<string, [string, string]> = {
  def: ['معرفة', 'Definite'], indef: ['نكرة', 'Indefinite'], const: ['مضاف', 'Construct'],
};

type Row = { labelAr: string; labelEn: string; value: string };

function buildRows(m: WordMorphology): Row[] {
  const rows: Row[] = [];

  rows.push({ labelAr: 'نوع الكلمة', labelEn: 'Part of Speech', value: `${m.posAr} · ${m.pos}` });

  if (m.pattern) rows.push({ labelAr: 'الوزن', labelEn: 'Pattern', value: m.pattern });
  if (m.derivation) rows.push({ labelAr: 'الاشتقاق', labelEn: 'Derivation', value: m.derivation });
  if (m.gender && GENDER_LABELS[m.gender])
    rows.push({ labelAr: 'الجنس', labelEn: 'Gender', value: `${GENDER_LABELS[m.gender][0]} · ${GENDER_LABELS[m.gender][1]}` });
  if (m.number && NUMBER_LABELS[m.number])
    rows.push({ labelAr: 'العدد', labelEn: 'Number', value: `${NUMBER_LABELS[m.number][0]} · ${NUMBER_LABELS[m.number][1]}` });
  if (m.person && PERSON_LABELS[m.person])
    rows.push({ labelAr: 'الشخص', labelEn: 'Person', value: `${PERSON_LABELS[m.person][0]} · ${PERSON_LABELS[m.person][1]}` });
  if (m.case && CASE_LABELS[m.case])
    rows.push({ labelAr: 'الحالة الإعرابية', labelEn: 'Case', value: `${CASE_LABELS[m.case][0]} · ${CASE_LABELS[m.case][1]}` });
  if (m.mood && MOOD_LABELS[m.mood])
    rows.push({ labelAr: 'المزاج', labelEn: 'Mood', value: `${MOOD_LABELS[m.mood][0]} · ${MOOD_LABELS[m.mood][1]}` });
  if (m.voice && VOICE_LABELS[m.voice])
    rows.push({ labelAr: 'الصيغة', labelEn: 'Voice', value: `${VOICE_LABELS[m.voice][0]} · ${VOICE_LABELS[m.voice][1]}` });
  if (m.state && STATE_LABELS[m.state])
    rows.push({ labelAr: 'الحالة', labelEn: 'State', value: `${STATE_LABELS[m.state][0]} · ${STATE_LABELS[m.state][1]}` });

  return rows;
}

export default function MorphologyTable({ morphology, colors }: Props) {
  const rows = buildRows(morphology);

  return (
    <View style={{ gap: 1, overflow: 'hidden', borderRadius: 10 }}>
      {rows.map((row, i) => (
        <View
          key={i}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 10,
            paddingHorizontal: 14,
            backgroundColor: i % 2 === 0 ? colors.bgSecondary : colors.bgTertiary,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, color: colors.textMuted }}>{row.labelEn}</Text>
            <Text style={{ fontSize: 11, color: colors.textFaint }}>{row.labelAr}</Text>
          </View>
          <Text style={{ fontSize: 13, color: colors.text, fontWeight: '500', textAlign: 'right' }}>
            {row.value}
          </Text>
        </View>
      ))}
    </View>
  );
}
