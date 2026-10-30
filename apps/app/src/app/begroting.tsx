import { dateLong, doctorById, emit, ESTIMATE, euro, INSURANCE } from '@smile/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Screen } from '../components/Screen';
import { Avatar, Bar, Bracket, Button, Card, Check, DemoNote, IconTile, PopIn, Row, SectionHead, tap, Txt } from '../components/ui';
import { useApp } from '../state/app';
import { C } from '../theme';

/**
 * The cost estimate for the crown on the implant, with what the supplementary insurance pays this year and what is left
 * for you; approve it in the app and the clinic sees it. The amounts are demo amounts, not Elite Smile's prices.
 */
export default function Begroting() {
  const { saved, update } = useApp();
  const [ok, setOk] = useState(false);
  const total = ESTIMATE.lines.reduce((s, l) => s + l.amount, 0);
  const left = INSURANCE.limit - INSURANCE.used;
  const covered = Math.min(total * INSURANCE.share, left);
  const pay = total - covered;
  const doc = doctorById(ESTIMATE.by);

  return (
    <Screen
      back
      title="Begroting"
      kicker="Vooraf weten waar je aan toe bent"
      serif={ESTIMATE.title}
      footer={
        saved.estimateOk ? (
          <Button full size="lg" kind="line" title="Terug" onPress={() => router.back()} />
        ) : (
          <Button
            full
            size="lg"
            kind="blue"
            icon="check"
            title="Akkoord met de begroting"
            disabled={!ok}
            onPress={() => {
              tap('success');
              update({ estimateOk: Date.now() });
              emit({ kind: 'estimate-ok', who: 'layla', estimate: ESTIMATE.id });
            }}
          />
        )
      }
    >
      <PopIn>
        <Card tone="navy">
          <Row style={{ justifyContent: 'space-between' }} align="flex-start">
            <View style={{ gap: 4 }}>
              <Bracket color="#7FC9F2">Jij betaalt</Bracket>
              <Txt v="mega" size={46} color="#FFFFFF">
                {euro(Math.round(pay))}
              </Txt>
              <Txt v="small" color="#B6C2DF">
                {`van ${euro(total)} · je verzekering betaalt ${euro(Math.round(covered))}`}
              </Txt>
            </View>
            <IconTile name="euro" color="#C9A15B" size={44} />
          </Row>
          <View style={{ marginTop: 16, gap: 6 }}>
            <Bar value={covered / total} color="#2DB4E8" />
            <Row style={{ justifyContent: 'space-between' }}>
              <Txt v="label" size={9} color="#7FC9F2">
                Verzekering
              </Txt>
              <Txt v="label" size={9} color="#B6C2DF">
                Eigen deel
              </Txt>
            </Row>
          </View>
        </Card>
      </PopIn>

      <View>
        <SectionHead kicker="Posten" title="Wat er gebeurt" />
        <Card>
          {ESTIMATE.lines.map((l) => (
            <Row key={l.label} style={{ justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderColor: C.line }}>
              <Txt v="body" style={{ flex: 1 }}>
                {l.label}
              </Txt>
              <Txt v="num">{euro(l.amount)}</Txt>
            </Row>
          ))}
          <Row style={{ justifyContent: 'space-between', paddingTop: 12 }}>
            <Txt v="h2">Totaal</Txt>
            <Txt v="stat" size={22}>
              {euro(total)}
            </Txt>
          </Row>
          <Row gap={10} style={{ marginTop: 14 }}>
            <Avatar id={doc.id} size={30} />
            <Txt v="small" color={C.muted}>
              {`Opgesteld door ${doc.name}`}
            </Txt>
          </Row>
        </Card>
      </View>

      <View>
        <SectionHead kicker="Verzekering" title={INSURANCE.name} />
        <Card tone="pearl">
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt v="small" color={C.soft}>{`Vergoeding ${Math.round(INSURANCE.share * 100)}%, tot ${euro(INSURANCE.limit)} per jaar`}</Txt>
          </Row>
          <Bar value={INSURANCE.used / INSURANCE.limit} style={{ marginTop: 12 }} />
          <Row style={{ justifyContent: 'space-between', marginTop: 8 }}>
            <Txt v="num" size={12} color={C.muted}>
              {`${euro(INSURANCE.used)} gebruikt`}
            </Txt>
            <Txt v="num" size={12} color={C.blue}>
              {`${euro(left)} over`}
            </Txt>
          </Row>
          <Txt v="small" color={C.soft} style={{ marginTop: 12 }}>
            Tandzorg voor volwassenen zit meestal niet in de basisverzekering; een aanvullende verzekering vergoedt een deel. Voor kinderen tot 18 jaar zit de meeste tandzorg wel in de basisverzekering.
          </Txt>
        </Card>
      </View>

      {saved.estimateOk ? (
        <Card tone="ice" style={{ borderColor: 'transparent' }}>
          <Txt v="h3">{`Akkoord gegeven op ${dateLong(new Date(saved.estimateOk))}`}</Txt>
          <Txt v="small" color={C.soft}>
            De kliniek ziet het op het praktijkscherm.
          </Txt>
        </Card>
      ) : (
        <Card pad={0} style={{ paddingHorizontal: 16 }}>
          <Check done={ok} onPress={() => setOk(!ok)} title="Ik heb de begroting gelezen" sub="Wijkt de behandeling af, dan hoor je het vooraf." />
        </Card>
      )}
      <DemoNote text="Demobedragen, geen tarieven van Elite Smile. Bij grotere behandelingen krijg je vooraf een schriftelijke begroting van de praktijk." />
    </Screen>
  );
}
