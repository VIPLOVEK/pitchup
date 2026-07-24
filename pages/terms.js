import Layout from '../components/Layout'
import { Card } from '../components/UI'
import { colors } from '../lib/tokens'

const Section = ({ title, children }) => (
  <div style={{ marginBottom: 24 }}>
    <h2 style={{ fontSize: 15, fontWeight: 700, color: colors.accent, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</h2>
    {children}
  </div>
)

const P = ({ children }) => (
  <p style={{ color: colors.muted, fontSize: 14, lineHeight: 1.7, margin: '0 0 10px' }}>{children}</p>
)

export default function TermsPage() {
  return (
    <Layout title="Terms & Conditions — PitchUp">
      <Card>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 4px' }}>Terms & Conditions</h1>
        <p style={{ color: colors.muted, fontSize: 12, margin: '0 0 24px' }}>Last updated: July 2025</p>

        <Section title="What PitchUp is">
          <P>PitchUp is an informal social tool for organising recreational football games. It is not a registered sports club, coaching organisation, or commercial service. The app is provided as-is for the convenience of its members.</P>
        </Section>

        <Section title="Participation at your own risk">
          <P>Football is a contact sport. By joining any game organised through PitchUp, you acknowledge that participation carries an inherent risk of physical injury, including serious injury.</P>
          <P>You confirm that you are participating voluntarily and that you accept full responsibility for any injury, loss, or damage that may result from your participation.</P>
        </Section>

        <Section title="Age requirement">
          <P>You must be 18 years of age or older to join games through PitchUp. By accepting these terms you confirm you meet this requirement.</P>
        </Section>

        <Section title="Fitness to play">
          <P>By joining a game, you confirm that you are in good physical health and have no medical condition (including heart conditions, injuries, or illness) that would make it unsafe for you to participate in contact sport.</P>
          <P>If in doubt, please consult a medical professional before playing.</P>
        </Section>

        <Section title="No liability">
          <P>PitchUp and its organisers, to the fullest extent permitted by law, accept no responsibility or liability for:</P>
          <ul style={{ color: colors.muted, fontSize: 14, lineHeight: 1.8, paddingLeft: 20, margin: '0 0 10px' }}>
            <li>Any injury sustained before, during, or after a game</li>
            <li>Any loss or damage to personal property</li>
            <li>Any cancellation of a game for any reason</li>
            <li>Any action or omission of another participant</li>
          </ul>
          <P>Nothing in these terms limits liability for death or personal injury caused by negligence.</P>
        </Section>

        <Section title="Venue rules">
          <P>Players are expected to comply with the rules and requirements of any venue used. PitchUp is not responsible for venue conditions or venue-specific requirements.</P>
        </Section>

        <Section title="Conduct">
          <P>All players are expected to treat other participants with respect. The organiser reserves the right to remove any player from the group for misconduct.</P>
        </Section>

        <Section title="Changes">
          <P>These terms may be updated from time to time. Continued participation in PitchUp games constitutes acceptance of any changes.</P>
        </Section>
      </Card>
    </Layout>
  )
}
