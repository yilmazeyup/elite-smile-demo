import { CLINIC } from '@smile/shared';
import { useState } from 'react';
import { Linking, Platform, Share, View } from 'react-native';

import { ToothMark } from '../components/Logo';
import { Screen } from '../components/Screen';
import { Bracket, Button, Card, PopIn, Row, tap, Txt } from '../components/ui';
import { tr } from '../i18n';
import { C, fx } from '../theme';

/** Sharing Elite Smile's free check-up with someone who hasn't been to a dentist for a while. No rewards, just the link. */
export default function Delen() {
  const [copied, setCopied] = useState(false);
  const url = Platform.OS === 'web' && typeof window !== 'undefined' ? new URL('afspraak?behandeling=controle&voor=nieuw', window.location.href.replace(/\/app\/.*$/, '/app/')).toString() : CLINIC.site;
  const text = `${tr('Elite Smile in Eindhoven en Hoogland biedt een gratis controle. Hier plan je hem:')} ${url}`;

  return (
    <Screen back title="Deel de gratis controle" kicker="Voor wie al lang niet is geweest" serif="Een controle elk half jaar voorkomt grote problemen.">
      <PopIn>
        <Card tone="navy" style={{ alignItems: 'center', paddingVertical: 30, gap: 14 }}>
          <View {...fx('float')}>
            <ToothMark size={90} color="#FFFFFF" />
          </View>
          <Bracket color="#7FC9F2">Gratis controle</Bracket>
          <Txt v="display" color="#FFFFFF" align="center">
            Je perfecte glimlach begint hier
          </Txt>
          <Txt v="small" color="#B6C2DF" align="center" style={{ maxWidth: 280 }}>
            Mondonderzoek en advies bij Elite Smile, in Eindhoven of Hoogland.
          </Txt>
        </Card>
      </PopIn>
      <Card>
        <Txt v="body" color={C.soft} raw>
          {text}
        </Txt>
      </Card>
      <Row gap={10} wrap>
        <Button
          title="Deel"
          icon="share"
          kind="blue"
          onPress={() => {
            tap('success');
            if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.share) navigator.share({ title: 'Elite Smile', text, url }).catch(() => {});
            else Share.share({ message: text }).catch(() => {});
          }}
        />
        <Button title="WhatsApp" icon="whatsapp" kind="line" onPress={() => Linking.openURL(`https://wa.me/?text=${encodeURIComponent(text)}`)} />
        <Button
          title={copied ? 'Gekopieerd' : 'Kopieer link'}
          icon={copied ? 'check' : 'doc'}
          kind="line"
          onPress={() => {
            if (Platform.OS === 'web') navigator.clipboard?.writeText(url).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        />
      </Row>
      <Txt v="small" color={C.muted}>
        Je deelt alleen een link; er wordt niets over jou meegestuurd.
      </Txt>
    </Screen>
  );
}
