import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RecordButton } from '@/components/RecordButton';
import { Body, Button, Chip, ErrorText, Muted, Title } from '@/components/ui';
import type { LanguageCode } from '@/content/types';
import { useSpeechRecorder } from '@/hooks/useSpeechRecorder';
import { playReplyAudio, speak, stopAllAudio } from '@/lib/audio';
import { allLessons, localize, nextLesson, type LessonRef } from '@/lib/course';
import { errorMessage } from '@/lib/errors';
import { languageName, t } from '@/lib/i18n';
import { useLearner } from '@/lib/session';
import { chatTurn, type ChatTurn, type Scenario, type Utterance } from '@/lib/tutor';
import { colors, radius, spacing } from '@/theme';

const MAX_HISTORY = 12;

type Mode = 'rolePlay' | 'free';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  translation?: string | null;
  correction?: string | null;
  pending?: boolean;
}

interface Conversation {
  scenario: Scenario;
  opening: string | null;
  suggestions: string[];
}

function buildConversation(mode: Mode, ref: LessonRef, ui: LanguageCode): Conversation {
  if (mode === 'rolePlay') {
    const rolePlay = ref.lesson.rolePlay;
    return {
      scenario: { topic: rolePlay.topic, goal: localize(rolePlay.goal, ui) },
      opening: rolePlay.opening,
      suggestions: rolePlay.starterLines,
    };
  }
  const topic = localize(ref.unit.title, ui);
  return {
    scenario: { topic: `Free conversation about: ${topic}`, goal: t(ui, 'freeGoal', { topic }) },
    opening: null,
    suggestions: ref.unit.lessons.flatMap((l) => l.items.filter((i) => i.kind === 'sentence').map((i) => i.text)).slice(0, 4),
  };
}

export default function SpeakScreen() {
  const params = useLocalSearchParams<{ lessonId?: string }>();
  const { profile, ui, completed, updateStreak } = useLearner();
  const target = profile.targetLanguage;
  const lessons = useMemo(() => allLessons(target), [target]);

  const defaultLessonId = () =>
    params.lessonId ??
    [...lessons].reverse().find((ref) => completed.has(ref.lesson.id))?.lesson.id ??
    nextLesson(target, completed)?.lesson.id ??
    lessons[0].lesson.id;

  const [mode, setMode] = useState<Mode>('rolePlay');
  const [lessonId, setLessonId] = useState(defaultLessonId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nextId = useRef(1);
  const scrollRef = useRef<ScrollView>(null);

  const ref = lessons.find((l) => l.lesson.id === lessonId) ?? lessons[0];
  const conversation = useMemo(() => buildConversation(mode, ref, ui), [mode, ref, ui]);

  useEffect(() => {
    if (params.lessonId) {
      setMode('rolePlay');
      setLessonId(params.lessonId);
    }
  }, [params.lessonId]);

  const resetConversation = useCallback(() => {
    stopAllAudio();
    setError(null);
    setMessages(
      conversation.opening ? [{ id: nextId.current++, role: 'assistant', text: conversation.opening }] : []
    );
    if (conversation.opening) speak(conversation.opening, target, 0.95);
  }, [conversation, target]);

  useEffect(resetConversation, [resetConversation]);

  useEffect(() => stopAllAudio, []);

  const send = async (utterance: Utterance) => {
    const history: ChatTurn[] = messages
      .filter((m) => !m.pending)
      .slice(-MAX_HISTORY)
      .map((m) => ({ role: m.role, content: m.text }));
    const placeholderId = nextId.current++;
    setMessages((current) => [
      ...current,
      { id: placeholderId, role: 'user', text: utterance.text ?? '…', pending: true },
    ]);
    setSending(true);
    setError(null);
    try {
      const result = await chatTurn(profile, utterance, conversation.scenario, history);
      updateStreak(result.streak);
      setMessages((current) => [
        ...current.map((m) =>
          m.id === placeholderId ? { ...m, text: result.transcript, pending: false, correction: result.correction } : m
        ),
        { id: nextId.current++, role: 'assistant', text: result.reply, translation: result.translation },
      ]);
      if (result.audioBase64) playReplyAudio(result.audioBase64);
      else speak(result.reply, target, 0.95);
    } catch (e) {
      setMessages((current) => current.filter((m) => m.id !== placeholderId));
      setError(errorMessage(ui, e));
    } finally {
      setSending(false);
    }
  };

  const recorder = useSpeechRecorder((uri) => send({ audioUri: uri }));

  const sendDraft = () => {
    const text = draft.trim();
    if (!text || sending) return;
    setDraft('');
    void send({ text });
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Title>{t(ui, 'tabSpeak')}</Title>
            <Pressable accessibilityRole="button" onPress={resetConversation} hitSlop={8} style={styles.restart}>
              <Ionicons name="refresh" size={18} color={colors.primary} />
              <Text style={styles.restartLabel}>{t(ui, 'startOver')}</Text>
            </Pressable>
          </View>
          <View style={styles.row}>
            <Chip label={t(ui, 'rolePlay')} selected={mode === 'rolePlay'} onPress={() => setMode('rolePlay')} />
            <Chip label={t(ui, 'freePractice')} selected={mode === 'free'} onPress={() => setMode('free')} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {(mode === 'rolePlay' ? lessons : lessons.filter((l) => l.unit.lessons[0].id === l.lesson.id)).map((l) => (
              <Chip
                key={l.lesson.id}
                label={localize(mode === 'rolePlay' ? l.lesson.title : l.unit.title, ui)}
                selected={mode === 'rolePlay' ? l.lesson.id === ref.lesson.id : l.unit.id === ref.unit.id}
                onPress={() => setLessonId(l.lesson.id)}
              />
            ))}
          </ScrollView>
          <View style={styles.goal}>
            <Muted>{t(ui, 'goal')}</Muted>
            <Body>{conversation.scenario.goal}</Body>
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.fill}
          contentContainerStyle={styles.messages}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} ui={ui} onReplay={() => speak(message.text, target, 0.95)} />
          ))}
          {sending && <Muted style={styles.thinking}>{t(ui, 'thinking')}</Muted>}
          {messages.filter((m) => m.role === 'user').length === 0 && conversation.suggestions.length > 0 && (
            <View style={styles.suggestions}>
              <Muted>{t(ui, 'trySaying')}</Muted>
              <View style={styles.wrapRow}>
                {conversation.suggestions.map((line) => (
                  <Chip key={line} label={line} onPress={() => speak(line, target)} />
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputArea}>
          {recorder.permissionDenied && <ErrorText message={t(ui, 'micDenied')} />}
          <ErrorText message={error} />
          {typing ? (
            <View style={styles.typeRow}>
              <TextInput
                style={styles.input}
                value={draft}
                onChangeText={setDraft}
                placeholder={t(ui, 'typeMessage', { language: languageName(ui, target) })}
                placeholderTextColor={colors.muted}
                onSubmitEditing={sendDraft}
                returnKeyType="send"
                editable={!sending}
              />
              <Button label={t(ui, 'send')} onPress={sendDraft} disabled={!draft.trim()} loading={sending} />
            </View>
          ) : (
            <RecordButton
              recording={recorder.isRecording}
              busy={sending}
              size={68}
              label={recorder.isRecording ? `${t(ui, 'tapToStop')} · ${recorder.seconds}s` : t(ui, 'tapToSpeak')}
              onPress={recorder.isRecording ? recorder.stop : recorder.start}
            />
          )}
          <Button
            variant="ghost"
            label={typing ? t(ui, 'speakInstead') : t(ui, 'typeInstead')}
            onPress={() => setTyping(!typing)}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MessageBubble({
  message,
  ui,
  onReplay,
}: {
  message: Message;
  ui: LanguageCode;
  onReplay: () => void;
}) {
  const [showTranslation, setShowTranslation] = useState(false);
  const mine = message.role === 'user';
  return (
    <View style={[styles.bubbleWrap, mine ? styles.bubbleWrapMine : null]}>
      <Pressable
        onPress={mine ? undefined : onReplay}
        style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs, message.pending && styles.pending]}>
        <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{message.text}</Text>
        {!mine && message.translation ? (
          showTranslation ? (
            <Text style={styles.translation}>{message.translation}</Text>
          ) : (
            <Text style={styles.link} onPress={() => setShowTranslation(true)}>
              {t(ui, 'showTranslation')}
            </Text>
          )
        ) : null}
      </Pressable>
      {mine && message.correction ? (
        <View style={styles.correction}>
          <Text style={styles.correctionLabel}>{t(ui, 'correction')}</Text>
          <Text style={styles.correctionText}>{message.correction}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  fill: { flex: 1 },
  header: { paddingHorizontal: spacing.md, paddingTop: spacing.md, gap: spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  restart: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  restartLabel: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  row: { flexDirection: 'row', gap: spacing.sm },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  goal: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: spacing.sm + 4,
    gap: 2,
  },
  messages: { padding: spacing.md, gap: spacing.sm },
  thinking: { alignSelf: 'flex-start', fontStyle: 'italic' },
  suggestions: { gap: spacing.sm, marginTop: spacing.sm },
  bubbleWrap: { alignItems: 'flex-start', gap: 4 },
  bubbleWrapMine: { alignItems: 'flex-end' },
  bubble: { maxWidth: '85%', borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: 10, gap: 6 },
  bubbleTheirs: { backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  bubbleMine: { backgroundColor: colors.primary },
  pending: { opacity: 0.6 },
  bubbleText: { fontSize: 16, color: colors.text, lineHeight: 22 },
  bubbleTextMine: { color: '#fff' },
  translation: { fontSize: 14, color: colors.muted, fontStyle: 'italic' },
  link: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  correction: {
    maxWidth: '85%',
    backgroundColor: '#FFF7E6',
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    gap: 2,
  },
  correctionLabel: { fontSize: 12, fontWeight: '700', color: colors.warning, textTransform: 'uppercase' },
  correctionText: { fontSize: 14, color: colors.text },
  inputArea: {
    padding: spacing.md,
    gap: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'stretch',
  },
  typeRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
});
