import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { passwordStrength } from '@junta/validation';
import { Field, colors } from './ui';

export function PasswordField({
  value,
  onChangeText,
  creation = false,
}: {
  value: string;
  onChangeText: (v: string) => void;
  creation?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const result = passwordStrength(value);
  const color = ['#63708a', '#b72e32', '#986300', '#2549eb', '#17765c'][result.score];
  return (
    <View style={{ gap: 8 }}>
      <Field
        label="Senha"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={128}
        autoComplete={creation ? 'new-password' : 'current-password'}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={visible ? 'Ocultar senha' : 'Mostrar senha'}
        accessibilityState={{ selected: visible }}
        onPress={() => setVisible((v) => !v)}
      >
        <Text style={{ color: colors.blue, textAlign: 'right' }}>
          {visible ? 'Ocultar senha' : 'Mostrar senha'}
        </Text>
      </Pressable>
      {creation && (
        <View style={{ gap: 8, marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text>Força da senha</Text>
            <Text accessibilityLiveRegion="polite" style={{ color, fontWeight: '700' }}>
              {result.label}
            </Text>
          </View>
          <View
            accessibilityRole="progressbar"
            accessibilityLabel="Força da senha"
            accessibilityValue={{ min: 0, max: 4, now: result.score, text: result.label }}
            style={{ flexDirection: 'row', gap: 5 }}
          >
            {[1, 2, 3, 4].map((n) => (
              <View
                key={n}
                style={{
                  flex: 1,
                  height: 5,
                  borderRadius: 3,
                  backgroundColor: n <= result.score ? color : colors.line,
                }}
              />
            ))}
          </View>
          <Text style={{ color: result.meetsMinimum ? colors.green : colors.muted }}>
            Pelo menos 12 caracteres ({value.length}/128){result.meetsMinimum ? ' ✓' : ''}
          </Text>
          <Text accessibilityLiveRegion="polite" style={{ color: colors.muted, fontSize: 13 }}>
            {result.hint}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            A força é uma estimativa. Evite dados pessoais e senhas reutilizadas.
          </Text>
        </View>
      )}
    </View>
  );
}
