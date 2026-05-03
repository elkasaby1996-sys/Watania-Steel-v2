create or replace function public.steel_analytics_summary(
  start_date date,
  end_date date,
  mode text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  result jsonb;
begin
  select role
    into v_role
    from public.profiles
   where id = auth.uid();

  if v_role is null or v_role not in ('admin', 'editor', 'viewer') then
    raise exception 'not authorized';
  end if;

  if start_date is null or end_date is null or start_date > end_date then
    raise exception 'invalid analytics date range';
  end if;

  if mode not in ('all', 'straight-bar', 'cut-and-bend') then
    raise exception 'invalid analytics mode';
  end if;

  with combined as (
    select
      id,
      date,
      case
        when regexp_replace(lower(coalesce(order_type, '')), '[^a-z0-9]+', '', 'g') in ('cutandbend', 'cutbend')
          then 'cut-and-bend'
        else 'straight-bar'
      end as normalized_order_type,
      tons,
      breakdown_8mm,
      breakdown_10mm,
      breakdown_12mm,
      breakdown_14mm,
      breakdown_16mm,
      breakdown_18mm,
      breakdown_20mm,
      breakdown_25mm,
      breakdown_32mm,
      0 as source_priority
    from public.history_orders
    where status = 'delivered'
    union all
    select
      id,
      coalesce(delivered_at::date, date) as date,
      case
        when regexp_replace(lower(coalesce(order_type, '')), '[^a-z0-9]+', '', 'g') in ('cutandbend', 'cutbend')
          then 'cut-and-bend'
        else 'straight-bar'
      end as normalized_order_type,
      tons,
      breakdown_8mm,
      breakdown_10mm,
      breakdown_12mm,
      breakdown_14mm,
      breakdown_16mm,
      breakdown_18mm,
      breakdown_20mm,
      breakdown_25mm,
      breakdown_32mm,
      1 as source_priority
    from public.orders
    where status = 'delivered'
  ),
  deduped as (
    select *
    from (
      select
        combined.*,
        row_number() over (partition by id order by source_priority) as row_rank
      from combined
    ) ranked
    where row_rank = 1
  ),
  filtered as (
    select *
      from deduped
     where date between start_date and end_date
       and (mode = 'all' or normalized_order_type = mode)
  ),
  date_span as (
    select generate_series(start_date, end_date, interval '1 day')::date as date
  ),
  daily as (
    select
      date_span.date,
      coalesce(sum(filtered.tons), 0) as tons
    from date_span
    left join filtered on filtered.date = date_span.date
    group by date_span.date
  ),
  breakdown as (
    select
      coalesce(sum(breakdown_8mm), 0) as breakdown_8mm,
      coalesce(sum(breakdown_10mm), 0) as breakdown_10mm,
      coalesce(sum(breakdown_12mm), 0) as breakdown_12mm,
      coalesce(sum(breakdown_14mm), 0) as breakdown_14mm,
      coalesce(sum(breakdown_16mm), 0) as breakdown_16mm,
      coalesce(sum(breakdown_18mm), 0) as breakdown_18mm,
      coalesce(sum(breakdown_20mm), 0) as breakdown_20mm,
      coalesce(sum(breakdown_25mm), 0) as breakdown_25mm,
      coalesce(sum(breakdown_32mm), 0) as breakdown_32mm
    from filtered
  ),
  totals as (
    select
      count(*) as rows_analyzed,
      count(distinct date) as active_days,
      coalesce(sum(tons), 0) as total_tons,
      greatest((end_date - start_date) + 1, 1) as calendar_days
    from filtered
  ),
  breakdown_total as (
    select
      breakdown_8mm
      + breakdown_10mm
      + breakdown_12mm
      + breakdown_14mm
      + breakdown_16mm
      + breakdown_18mm
      + breakdown_20mm
      + breakdown_25mm
      + breakdown_32mm as total_breakdown
    from breakdown
  )
  select jsonb_build_object(
    'rows_analyzed', totals.rows_analyzed,
    'active_days', totals.active_days,
    'total_tons', totals.total_tons,
    'daily_average', totals.total_tons / totals.calendar_days,
    'time_series', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object('date', date, 'tons', tons)
          order by date
        )
        from daily
      ),
      '[]'::jsonb
    ),
    'diameter_totals', to_jsonb(
      array_remove(
        array[
          jsonb_build_object('label', '8mm', 'tons', breakdown.breakdown_8mm),
          jsonb_build_object('label', '10mm', 'tons', breakdown.breakdown_10mm),
          jsonb_build_object('label', '12mm', 'tons', breakdown.breakdown_12mm),
          jsonb_build_object('label', '14mm', 'tons', breakdown.breakdown_14mm),
          jsonb_build_object('label', '16mm', 'tons', breakdown.breakdown_16mm),
          jsonb_build_object('label', '18mm', 'tons', breakdown.breakdown_18mm),
          jsonb_build_object('label', '20mm', 'tons', breakdown.breakdown_20mm),
          jsonb_build_object('label', '25mm', 'tons', breakdown.breakdown_25mm),
          jsonb_build_object('label', '32mm', 'tons', breakdown.breakdown_32mm),
          case
            when totals.total_tons > breakdown_total.total_breakdown
              then jsonb_build_object(
                'label',
                'Other',
                'tons',
                totals.total_tons - breakdown_total.total_breakdown
              )
            else null
          end
        ],
        null
      )
    )
  )
  into result
  from totals, breakdown, breakdown_total;

  return result;
end;
$$;

create or replace function public.steel_analytics_max_date(mode text)
returns date
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  result date;
begin
  select role
    into v_role
    from public.profiles
   where id = auth.uid();

  if v_role is null or v_role not in ('admin', 'editor', 'viewer') then
    raise exception 'not authorized';
  end if;

  if mode not in ('all', 'straight-bar', 'cut-and-bend') then
    raise exception 'invalid analytics mode';
  end if;

  with combined as (
    select
      id,
      date,
      case
        when regexp_replace(lower(coalesce(order_type, '')), '[^a-z0-9]+', '', 'g') in ('cutandbend', 'cutbend')
          then 'cut-and-bend'
        else 'straight-bar'
      end as normalized_order_type,
      0 as source_priority
    from public.history_orders
    where status = 'delivered'
    union all
    select
      id,
      coalesce(delivered_at::date, date) as date,
      case
        when regexp_replace(lower(coalesce(order_type, '')), '[^a-z0-9]+', '', 'g') in ('cutandbend', 'cutbend')
          then 'cut-and-bend'
        else 'straight-bar'
      end as normalized_order_type,
      1 as source_priority
    from public.orders
    where status = 'delivered'
  ),
  deduped as (
    select *
    from (
      select
        combined.*,
        row_number() over (partition by id order by source_priority) as row_rank
      from combined
    ) ranked
    where row_rank = 1
  )
  select max(date)
    into result
    from deduped
   where mode = 'all' or normalized_order_type = mode;

  return result;
end;
$$;

revoke all on function public.steel_analytics_summary(date, date, text) from public;
grant execute on function public.steel_analytics_summary(date, date, text) to authenticated;

revoke all on function public.steel_analytics_max_date(text) from public;
grant execute on function public.steel_analytics_max_date(text) to authenticated;

