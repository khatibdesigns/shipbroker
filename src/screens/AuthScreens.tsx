import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients } from '../lib/theme';
import { useI18n } from '../lib/i18n';
import { useNav } from '../lib/nav';
import { useAuth } from '../lib/auth';
import { Screen, Body, Row, Txt, Button, Field, Seg, AppBar, LangToggle, Upload, Link } from '../components/ui';
import { DobField } from '../components/DobField';
import { PlaceField } from '../components/PlaceField';
import { Icon } from '../components/Icon';

function AuthFooter() {
  const { t } = useI18n();
  return (
    <Txt size={12} weight="semibold" color={colors.textTertiary} align="center" style={{ marginTop: 24 }}>
      {t('Version 1.0', 'الإصدار 1.0')}
    </Txt>
  );
}

// Welcome / Login — full-bleed send gradient + the three real providers.
export function Welcome() {
  const { t } = useI18n();
  const nav = useNav();
  const { ensureSignedIn, signInGoogle, signInApple, appleAvailable, googleAvailable } = useAuth();
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>, goHome = true) => {
    setErr('');
    setBusy(true);
    try {
      await fn();
      if (goHome) {
        nav.popToRoot();
        nav.switchTab('home');
      }
    } catch (e: any) {
      const msg = String(e?.message || e || '');
      if (!/cancel/i.test(msg)) setErr(msg || t('Sign-in failed', 'فشل تسجيل الدخول'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={false}>
      <LinearGradient colors={gradients.send as any} start={{ x: 0, y: 0 }} end={{ x: 0.5, y: 1 }} style={{ flex: 1, paddingHorizontal: 24, paddingTop: 64, paddingBottom: 40 }}>
        <View style={{ position: 'absolute', width: 240, height: 240, borderRadius: 120, backgroundColor: '#7D8BFF', opacity: 0.4, top: -60, right: -60 }} />
        <View style={{ position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: '#00D9A3', opacity: 0.3, bottom: 200, left: -50 }} />
        <Row justify="flex-end">
          <LangToggle dark />
        </Row>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <View style={{ width: 60, height: 60, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center', marginBottom: 22 }}>
            <Icon name="box" size={32} color="#fff" sw={1.8} />
          </View>
          <Txt size={34} weight="extrabold" color="#fff" style={{ lineHeight: 36 }}>
            ShipBroker
          </Txt>
          <Txt size={16} color="rgba(255,255,255,0.85)" style={{ marginTop: 12, lineHeight: 24, maxWidth: 290 }}>
            {t('Send anything across the GCC. Travellers and companies bid to carry it.', 'أرسل أي شيء عبر الخليج. يتنافس المسافرون والشركات على توصيله.')}
          </Txt>
        </View>
        <View style={{ gap: 11 }}>
          {appleAvailable && (
            <Button label={t('Continue with Apple', 'المتابعة عبر Apple')} variant="dark" bg="#000" textColor="#fff" disabled={busy} onPress={() => run(signInApple)} />
          )}
          {googleAvailable && (
            <Button label={t('Continue with Google', 'المتابعة عبر Google')} variant="white" disabled={busy} onPress={() => run(signInGoogle)} />
          )}
          <Button label={t('Continue with email', 'المتابعة بالبريد')} bg="rgba(255,255,255,0.16)" textColor="#fff" disabled={busy} onPress={() => nav.push('EmailAuth')} />
          {!!err && (
            <Txt size={12.5} weight="semibold" color="#FFD9D9" align="center" style={{ marginTop: 2 }}>
              {err}
            </Txt>
          )}
          <Link label={t('Continue as guest', 'المتابعة كضيف')} color="rgba(255,255,255,0.85)" onPress={() => run(async () => { await ensureSignedIn(); })} />
          <Link label={t('Register as a service provider', 'سجّل كمزوّد خدمة')} color="rgba(255,255,255,0.85)" style={{ marginTop: -4 }} onPress={() => nav.push('RegisterProvider')} />
        </View>
      </LinearGradient>
    </Screen>
  );
}

// Email + password sign-in / create.
export function EmailAuth() {
  const { t } = useI18n();
  const nav = useNav();
  const { signInEmail, signUpEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'signin' | 'create'>('signin');

  const submit = async () => {
    setErr('');
    if (!email.trim() || pw.length < 6) {
      setErr(t('Enter an email and a 6+ character password.', 'أدخل بريداً وكلمة مرور من 6 أحرف فأكثر.'));
      return;
    }
    setBusy(true);
    try {
      if (mode === 'signin') await signInEmail(email, pw);
      else await signUpEmail(email, pw);
      nav.popToRoot();
      nav.switchTab('home');
    } catch (e: any) {
      setErr(String(e?.message || e || '').replace('Firebase: ', ''));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <AppBar onlyLang />
      <Body>
        <Txt size={25} weight="extrabold" style={{ marginTop: 4, marginBottom: 6 }}>
          {mode === 'signin' ? t('Welcome back', 'مرحباً بعودتك') : t('Create your account', 'أنشئ حسابك')}
        </Txt>
        <Txt size={14} color={colors.textSecondary} style={{ marginBottom: 20 }}>
          {t('Use your email and password.', 'استخدم بريدك وكلمة المرور.')}
        </Txt>
        <Field label={t('Email', 'البريد الإلكتروني')} ph="name@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <Field label={t('Password', 'كلمة المرور')} ph="••••••••" value={pw} onChangeText={setPw} secureTextEntry />
        {!!err && (
          <Txt size={13} weight="semibold" color={colors.error} style={{ marginBottom: 12 }}>
            {err}
          </Txt>
        )}
        <Button label={mode === 'signin' ? t('Sign in', 'تسجيل الدخول') : t('Create account', 'إنشاء الحساب')} size="lg" disabled={busy} onPress={submit} />
        <Link
          label={mode === 'signin' ? t("New here? Create an account", 'جديد هنا؟ أنشئ حساباً') : t('Already have an account? Sign in', 'لديك حساب؟ سجّل الدخول')}
          brand
          style={{ marginTop: 14 }}
          onPress={() => { setErr(''); setMode(mode === 'signin' ? 'create' : 'signin'); }}
        />
        <AuthFooter />
      </Body>
    </Screen>
  );
}

export function CreateAccount({ onboarding }: { onboarding?: boolean }) {
  const { t } = useI18n();
  const nav = useNav();
  const { saveProfile, profile, signOut, email: authEmail } = useAuth();
  const [gender, setGender] = useState(profile.gender || 'male');
  const [name, setName] = useState(profile.name || '');
  const [phone, setPhone] = useState(profile.phone || '');
  const [email, setEmail] = useState(profile.email || authEmail || '');
  const [address, setAddress] = useState(profile.address || '');
  const [dob, setDob] = useState(profile.dob || '');
  const [err, setErr] = useState('');

  // The email (and any profile fields) may arrive from the auth provider /
  // Firestore just after this screen mounts — fill any blanks when they do.
  useEffect(() => {
    if (!email && (profile.email || authEmail)) setEmail(profile.email || authEmail || '');
    if (!name && profile.name) setName(profile.name);
    if (!phone && profile.phone) setPhone(profile.phone);
    if (!address && profile.address) setAddress(profile.address);
    if (!dob && profile.dob) setDob(profile.dob);
  }, [profile, authEmail]);

  const submit = async () => {
    if (!name.trim()) {
      setErr(t('Please enter your name.', 'يرجى إدخال اسمك.'));
      return;
    }
    await saveProfile({ name: name.trim(), phone: phone.trim() || undefined, email: email.trim() || undefined, address: address.trim() || undefined, gender, dob: dob.trim() || undefined, persona: profile.persona || 'sender' });
    if (!onboarding) {
      nav.popToRoot();
      nav.switchTab('home');
    }
    // In onboarding mode the Shell gate flips to the app automatically once name is set.
  };

  return (
    <Screen>
      <AppBar onlyLang />
      <Body>
        <Txt size={25} weight="extrabold" style={{ marginTop: 4, marginBottom: onboarding ? 6 : 20 }}>
          {onboarding ? t('Welcome! A few details', 'مرحباً! بعض التفاصيل') : t('Create your account', 'أنشئ حسابك')}
        </Txt>
        {onboarding && (
          <Txt size={14} color={colors.textSecondary} style={{ marginBottom: 18 }}>
            {t('Tell us a bit about you so we can set up your shipments.', 'أخبرنا قليلاً عنك لإعداد شحناتك.')}
          </Txt>
        )}
        <Field label={t('Full name', 'الاسم الكامل')} ph={t('e.g. Ahmed Al-Kuwaiti', 'مثال: أحمد الكويتي')} value={name} onChangeText={setName} />
        <Field label={t('Phone number', 'رقم الهاتف')} ph="+965 50000000" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Field label={t('Email (optional)', 'البريد (اختياري)')} ph="name@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <PlaceField
          label={t('Address', 'العنوان')}
          ph={t('Search your address…', 'ابحث عن عنوانك…')}
          icon="pin"
          value={address}
          onChangeText={setAddress}
          onSelect={({ description }) => setAddress(description)}
        />
        <View style={{ marginBottom: 16 }}>
          <Txt size={13} weight="semibold" color={colors.textSecondary} style={{ marginBottom: 7, marginHorizontal: 2 }}>
            {t('Gender', 'الجنس')}
          </Txt>
          <Seg value={gender} onChange={setGender} options={[{ key: 'male', label: t('Male', 'ذكر') }, { key: 'female', label: t('Female', 'أنثى') }]} />
        </View>
        <DobField label={t('Date of birth', 'تاريخ الميلاد')} value={dob} onChange={setDob} />
        {!!err && (
          <Txt size={13} weight="semibold" color={colors.error} style={{ marginBottom: 10 }}>
            {err}
          </Txt>
        )}
        <Button label={onboarding ? t('Continue', 'متابعة') : t('Save details', 'حفظ التفاصيل')} size="lg" style={{ marginTop: 6 }} onPress={submit} />
        {onboarding ? (
          <Link label={t('Sign out', 'تسجيل الخروج')} style={{ marginTop: 12 }} onPress={async () => { await signOut(); }} />
        ) : (
          <Link label={t('Back', 'رجوع')} style={{ marginTop: 12 }} onPress={nav.canGoBack ? nav.pop : undefined} />
        )}
        <AuthFooter />
      </Body>
    </Screen>
  );
}

export function RegisterProvider() {
  const { t } = useI18n();
  const nav = useNav();
  const { saveProfile } = useAuth();
  const [company, setCompany] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');

  const submit = async () => {
    await saveProfile({ persona: 'provider', company: { name: company.trim() || undefined, address: address.trim() || undefined, phone: phone.trim() || undefined } });
    nav.push('ProviderTypes');
  };

  return (
    <Screen>
      <AppBar onlyLang />
      <Body>
        <Txt size={24} weight="extrabold" style={{ marginTop: 4, marginBottom: 20 }}>
          {t('Register as service provider', 'سجّل كمزوّد خدمة')}
        </Txt>
        <Field label={t('Company full name', 'الاسم الكامل للشركة')} ph={t('e.g. Kuwait Global Logistics Co.', 'مثال: شركة الكويت العالمية')} value={company} onChangeText={setCompany} />
        <Field label={t('Address', 'العنوان')} ph={t('Street, Building, Area, City', 'الشارع، المبنى، المنطقة، المدينة')} value={address} onChangeText={setAddress} />
        <Field label={t('Phone number', 'رقم الهاتف')} ph="+965 50000000" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <View style={{ marginBottom: 16 }}>
          <Txt size={13} weight="semibold" color={colors.textSecondary} style={{ marginBottom: 7, marginHorizontal: 2 }}>
            {t('Company license', 'رخصة الشركة')}
          </Txt>
          <Upload label={t('Tap to upload license (PDF / JPG / PNG)', 'اضغط لرفع الرخصة (PDF / JPG / PNG)')} />
        </View>
        <Field label={t('Business type', 'نوع النشاط')} ph={t('Select business type', 'اختر نوع النشاط')} select />
        <Field label={t('Country', 'الدولة')} ph={t('Select country', 'اختر الدولة')} select />
        <Button label={t('Create company account', 'إنشاء حساب الشركة')} size="lg" style={{ marginTop: 6 }} onPress={submit} />
        <Link label={t('Back to login', 'العودة لتسجيل الدخول')} style={{ marginTop: 12 }} onPress={nav.canGoBack ? nav.pop : undefined} />
        <AuthFooter />
      </Body>
    </Screen>
  );
}
